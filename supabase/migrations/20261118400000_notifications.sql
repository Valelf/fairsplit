-- Phase 1: email notifications (2026-11-18)
-- "Your bills are ready" emails, due-soon / overdue reminders and the owner's daily digest.
-- FairSplit never moves money; these emails only tell people what they owe and how to pay.
--
-- Additive and idempotent: safe to re-run.
--   * cycle_notifications: one row per email we sent (or skipped / failed). Unique indexes stop
--     duplicates. Rows are written only by the service role (server actions / cron route).
--   * profiles.email_reminders: per-profile opt-out for reminder and digest emails.
--   * billing_cycles.published_at: when the owner first sent the cycle to tenants.

-- ============================================================
-- profiles: opt-out flag
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email_reminders BOOLEAN NOT NULL DEFAULT true;

-- ============================================================
-- billing_cycles: published_at
-- ============================================================
ALTER TABLE public.billing_cycles
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

-- ============================================================
-- cycle_notifications
-- ============================================================
CREATE TABLE IF NOT EXISTS public.cycle_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL,
  cycle_id UUID REFERENCES public.billing_cycles(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  property_tenant_id UUID REFERENCES public.property_tenants(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  recipient_email TEXT NOT NULL,
  digest_date DATE,
  status TEXT NOT NULL DEFAULT 'pending',
  provider_id TEXT,
  error TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT cycle_notifications_kind_check
    CHECK (kind IN ('cycle_ready', 'due_soon', 'overdue', 'owner_digest')),
  CONSTRAINT cycle_notifications_status_check
    CHECK (status IN ('pending', 'sent', 'skipped', 'failed')),
  CONSTRAINT cycle_notifications_shape CHECK (
    (kind = 'owner_digest' AND recipient_id IS NOT NULL AND digest_date IS NOT NULL)
    OR (kind <> 'owner_digest' AND cycle_id IS NOT NULL AND property_id IS NOT NULL
        AND property_tenant_id IS NOT NULL)
  )
);

-- Once per tenant per cycle per kind.
CREATE UNIQUE INDEX IF NOT EXISTS uq_cycle_notifications_tenant
  ON public.cycle_notifications (cycle_id, property_tenant_id, kind)
  WHERE kind <> 'owner_digest';

-- One digest per owner per day.
CREATE UNIQUE INDEX IF NOT EXISTS uq_cycle_notifications_digest
  ON public.cycle_notifications (recipient_id, digest_date)
  WHERE kind = 'owner_digest';

CREATE INDEX IF NOT EXISTS idx_cycle_notifications_property
  ON public.cycle_notifications (property_id, cycle_id);

ALTER TABLE public.cycle_notifications ENABLE ROW LEVEL SECURITY;

-- Owners read the send log for their own properties, plus their own digests.
DROP POLICY IF EXISTS "Owners read own notification log" ON public.cycle_notifications;
CREATE POLICY "Owners read own notification log"
  ON public.cycle_notifications FOR SELECT
  TO authenticated
  USING (
    (property_id IS NOT NULL AND public.is_property_owner(property_id))
    OR recipient_id = auth.uid()
  );

DROP POLICY IF EXISTS "Admins read notification log" ON public.cycle_notifications;
CREATE POLICY "Admins read notification log"
  ON public.cycle_notifications FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- No INSERT / UPDATE / DELETE policies: only the service role writes this table.
REVOKE INSERT, UPDATE, DELETE ON public.cycle_notifications FROM anon, authenticated;
