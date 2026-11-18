-- Bill questions (2026-11-18)
-- A light "Ask about this bill" conversation between one tenant and the property owner,
-- replacing bill flags in the UI. bill_flags is left untouched (no destructive change).
--
-- Additive and idempotent: safe to re-run.
--   * bill_questions: one thread per (bill, asking tenant) while unresolved
--   * bill_question_messages: append-only messages (body 1..2000 chars)
--   * RLS: the asking tenant and the property owner read/write their thread; other tenants
--     see nothing; no updates/deletes except the owner resolving a thread.
--   * A trigger keeps the thread status in step with who spoke last:
--       owner message -> 'answered', asker message -> 'open'.

-- ============================================================
-- Tables
-- ============================================================
CREATE TABLE IF NOT EXISTS public.bill_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.property_tenants(id) ON DELETE CASCADE,
  asked_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'answered', 'resolved')),
  resolution_note TEXT CHECK (resolution_note IS NULL OR char_length(resolution_note) <= 2000),
  corrected_amount_cents INTEGER CHECK (corrected_amount_cents IS NULL OR corrected_amount_cents > 0),
  resolved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bill_questions_property ON public.bill_questions (property_id, status);
CREATE INDEX IF NOT EXISTS idx_bill_questions_bill ON public.bill_questions (bill_id);
CREATE INDEX IF NOT EXISTS idx_bill_questions_asked_by ON public.bill_questions (asked_by);
-- One live thread per tenant per bill; a resolved thread can be followed by a new one.
CREATE UNIQUE INDEX IF NOT EXISTS idx_bill_questions_one_live
  ON public.bill_questions (bill_id, asked_by) WHERE status <> 'resolved';

CREATE TABLE IF NOT EXISTS public.bill_question_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.bill_questions(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bill_question_messages_question
  ON public.bill_question_messages (question_id, created_at);

DROP TRIGGER IF EXISTS set_updated_at ON public.bill_questions;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.bill_questions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- Helpers (SECURITY DEFINER so policies don't recurse through RLS)
-- ============================================================

-- Can the signed-in user read this thread? (asker, property owner, or admin)
CREATE OR REPLACE FUNCTION public.can_read_bill_question(p_question_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.bill_questions q
    WHERE q.id = p_question_id
      AND (q.asked_by = auth.uid() OR public.is_property_owner(q.property_id) OR public.is_admin())
  );
$$;

-- Can the signed-in user post to this thread? (asker or owner, thread not resolved,
-- property_id matches the thread's)
CREATE OR REPLACE FUNCTION public.can_post_bill_question(p_question_id UUID, p_property_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.bill_questions q
    WHERE q.id = p_question_id
      AND q.property_id = p_property_id
      AND q.status <> 'resolved'
      AND (q.asked_by = auth.uid() OR public.is_property_owner(q.property_id))
  );
$$;

REVOKE ALL ON FUNCTION public.can_read_bill_question(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_read_bill_question(UUID) TO authenticated;
REVOKE ALL ON FUNCTION public.can_post_bill_question(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_post_bill_question(UUID, UUID) TO authenticated;

-- Status follows the last speaker. Runs as definer because tenants have no UPDATE right.
CREATE OR REPLACE FUNCTION public.bill_question_message_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.bill_questions q
     SET status = CASE WHEN q.asked_by = NEW.author_id THEN 'open' ELSE 'answered' END
   WHERE q.id = NEW.question_id
     AND q.status <> 'resolved';
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.bill_question_message_status() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS bill_question_message_status ON public.bill_question_messages;
CREATE TRIGGER bill_question_message_status AFTER INSERT ON public.bill_question_messages
  FOR EACH ROW EXECUTE FUNCTION public.bill_question_message_status();

-- ============================================================
-- RLS: bill_questions
-- ============================================================
ALTER TABLE public.bill_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Asker and owner read questions" ON public.bill_questions;
CREATE POLICY "Asker and owner read questions"
  ON public.bill_questions FOR SELECT
  TO authenticated
  USING (asked_by = auth.uid() OR public.is_property_owner(property_id) OR public.is_admin());

DROP POLICY IF EXISTS "Tenants ask about bills they can see" ON public.bill_questions;
CREATE POLICY "Tenants ask about bills they can see"
  ON public.bill_questions FOR INSERT
  TO authenticated
  WITH CHECK (
    asked_by = auth.uid()
    AND status = 'open'
    AND resolved_at IS NULL
    AND resolved_by IS NULL
    AND resolution_note IS NULL
    AND corrected_amount_cents IS NULL
    AND public.tenant_can_see_bill(bill_id)
    AND EXISTS (
      SELECT 1 FROM public.property_tenants pt
      WHERE pt.id = bill_questions.tenant_id
        AND pt.tenant_id = auth.uid()
        AND pt.property_id = bill_questions.property_id
        AND pt.status IN ('active', 'departed')
    )
    AND EXISTS (
      SELECT 1 FROM public.bills b
      WHERE b.id = bill_questions.bill_id AND b.property_id = bill_questions.property_id
    )
  );

DROP POLICY IF EXISTS "Owners resolve questions" ON public.bill_questions;
CREATE POLICY "Owners resolve questions"
  ON public.bill_questions FOR UPDATE
  TO authenticated
  USING (public.is_property_owner(property_id) AND status <> 'resolved')
  WITH CHECK (public.is_property_owner(property_id) AND status = 'resolved' AND resolved_by = auth.uid());

-- No DELETE policy: threads go away only with their bill/property (FK cascade).

REVOKE ALL ON public.bill_questions FROM anon, authenticated;
GRANT SELECT, INSERT ON public.bill_questions TO authenticated;
GRANT UPDATE (status, resolution_note, corrected_amount_cents, resolved_by, resolved_at)
  ON public.bill_questions TO authenticated;
GRANT ALL ON public.bill_questions TO service_role;

-- ============================================================
-- RLS: bill_question_messages (append-only)
-- ============================================================
ALTER TABLE public.bill_question_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Thread members read messages" ON public.bill_question_messages;
CREATE POLICY "Thread members read messages"
  ON public.bill_question_messages FOR SELECT
  TO authenticated
  USING (public.can_read_bill_question(question_id));

DROP POLICY IF EXISTS "Thread members post messages" ON public.bill_question_messages;
CREATE POLICY "Thread members post messages"
  ON public.bill_question_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND public.can_post_bill_question(question_id, property_id)
  );

REVOKE ALL ON public.bill_question_messages FROM anon, authenticated;
GRANT SELECT, INSERT ON public.bill_question_messages TO authenticated;
GRANT ALL ON public.bill_question_messages TO service_role;
