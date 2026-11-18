-- Phase 1: payment tracking (2026-11-18)
-- FairSplit never moves money. Tenants pay the owner via Venmo / Zelle / Cash App / PayPal and
-- the status of each split is tracked here: owed -> marked_paid (tenant) -> confirmed (owner).
--
-- Additive and idempotent: safe to re-run.
--   * bill_splits: payment_status + timestamps + note
--   * billing_cycles: due_date
--   * owner_payment_methods: the owner's payment handles, readable by their tenants
--   * RPCs: mark_cycle_paid / unmark_cycle_paid (tenant), confirm_tenant_cycle_payment /
--     reopen_tenant_cycle_payment (owner). Tenants still have NO update policy on bill_splits;
--     the RPCs are the only way a tenant can change a split.

-- ============================================================
-- bill_splits: payment status
-- ============================================================
ALTER TABLE public.bill_splits
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'owed',
  ADD COLUMN IF NOT EXISTS marked_paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS confirmed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payment_note TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bill_splits_payment_status_check'
  ) THEN
    ALTER TABLE public.bill_splits
      ADD CONSTRAINT bill_splits_payment_status_check
      CHECK (payment_status IN ('owed', 'marked_paid', 'confirmed'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bill_splits_payment_note_length'
  ) THEN
    ALTER TABLE public.bill_splits
      ADD CONSTRAINT bill_splits_payment_note_length
      CHECK (payment_note IS NULL OR char_length(payment_note) <= 500);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_bill_splits_payment_status
  ON public.bill_splits (property_id, payment_status);

-- ============================================================
-- billing_cycles: due date
-- ============================================================
ALTER TABLE public.billing_cycles
  ADD COLUMN IF NOT EXISTS due_date DATE;

-- ============================================================
-- owner_payment_methods
-- ============================================================
CREATE TABLE IF NOT EXISTS public.owner_payment_methods (
  owner_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  payee_name TEXT,
  venmo_handle TEXT,
  cashapp_handle TEXT,
  zelle_contact TEXT,
  paypal_me TEXT,
  instructions TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT owner_payment_methods_lengths CHECK (
    char_length(coalesce(payee_name, '')) <= 100
    AND char_length(coalesce(venmo_handle, '')) <= 50
    AND char_length(coalesce(cashapp_handle, '')) <= 50
    AND char_length(coalesce(zelle_contact, '')) <= 100
    AND char_length(coalesce(paypal_me, '')) <= 50
    AND char_length(coalesce(instructions, '')) <= 500
  )
);

DROP TRIGGER IF EXISTS set_updated_at ON public.owner_payment_methods;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.owner_payment_methods
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.owner_payment_methods ENABLE ROW LEVEL SECURITY;

-- Is the signed-in user an active or departed tenant of any (non-deleted) property this owner owns?
CREATE OR REPLACE FUNCTION public.is_tenant_of_owner(p_owner_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.property_tenants pt
    JOIN public.properties p ON p.id = pt.property_id
    WHERE p.owner_id = p_owner_id
      AND p.deleted_at IS NULL
      AND pt.tenant_id = auth.uid()
      AND pt.status IN ('active', 'departed')
  );
$$;

REVOKE ALL ON FUNCTION public.is_tenant_of_owner(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_tenant_of_owner(UUID) TO authenticated;

DROP POLICY IF EXISTS "Owners manage own payment methods" ON public.owner_payment_methods;
CREATE POLICY "Owners manage own payment methods"
  ON public.owner_payment_methods FOR ALL
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Tenants can view their owners' payment methods" ON public.owner_payment_methods;
CREATE POLICY "Tenants can view their owners' payment methods"
  ON public.owner_payment_methods FOR SELECT
  TO authenticated
  USING (public.is_tenant_of_owner(owner_id));

DROP POLICY IF EXISTS "Admins can view payment methods" ON public.owner_payment_methods;
CREATE POLICY "Admins can view payment methods"
  ON public.owner_payment_methods FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- ============================================================
-- RPCs
-- ============================================================

-- Tenant: mark all of MY owed splits in a cycle as paid. Returns the number of splits changed.
CREATE OR REPLACE FUNCTION public.mark_cycle_paid(p_cycle_id UUID, p_note TEXT DEFAULT NULL)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
  v_note TEXT := nullif(btrim(coalesce(p_note, '')), '');
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not signed in' USING ERRCODE = '42501';
  END IF;
  IF v_note IS NOT NULL AND char_length(v_note) > 500 THEN
    RAISE EXCEPTION 'Note is too long' USING ERRCODE = '22001';
  END IF;

  UPDATE public.bill_splits bs
     SET payment_status = 'marked_paid',
         marked_paid_at = now(),
         payment_note = v_note
    FROM public.bills b, public.property_tenants pt
   WHERE bs.bill_id = b.id
     AND b.cycle_id = p_cycle_id
     AND bs.tenant_id = pt.id
     AND pt.tenant_id = auth.uid()
     AND pt.status IN ('active', 'departed')
     AND bs.payment_status = 'owed';
  GET DIAGNOSTICS v_count = ROW_COUNT;

  IF v_count = 0 THEN
    RAISE EXCEPTION 'Nothing owed in this cycle' USING ERRCODE = 'P0002';
  END IF;
  RETURN v_count;
END;
$$;

-- Tenant: undo "I've paid" (only splits the owner has not confirmed yet).
CREATE OR REPLACE FUNCTION public.unmark_cycle_paid(p_cycle_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not signed in' USING ERRCODE = '42501';
  END IF;

  UPDATE public.bill_splits bs
     SET payment_status = 'owed',
         marked_paid_at = NULL,
         payment_note = NULL
    FROM public.bills b, public.property_tenants pt
   WHERE bs.bill_id = b.id
     AND b.cycle_id = p_cycle_id
     AND bs.tenant_id = pt.id
     AND pt.tenant_id = auth.uid()
     AND bs.payment_status = 'marked_paid';
  GET DIAGNOSTICS v_count = ROW_COUNT;

  IF v_count = 0 THEN
    RAISE EXCEPTION 'No unconfirmed payment to undo' USING ERRCODE = 'P0002';
  END IF;
  RETURN v_count;
END;
$$;

-- Owner: confirm a tenant's payment for a cycle (whether or not they marked it themselves).
CREATE OR REPLACE FUNCTION public.confirm_tenant_cycle_payment(p_cycle_id UUID, p_property_tenant_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_property_id UUID;
  v_count INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not signed in' USING ERRCODE = '42501';
  END IF;

  SELECT property_id INTO v_property_id FROM public.billing_cycles WHERE id = p_cycle_id;
  IF v_property_id IS NULL OR NOT public.is_property_owner(v_property_id) THEN
    RAISE EXCEPTION 'Cycle not found' USING ERRCODE = '42501';
  END IF;

  UPDATE public.bill_splits bs
     SET payment_status = 'confirmed',
         confirmed_at = now(),
         confirmed_by = auth.uid()
    FROM public.bills b
   WHERE bs.bill_id = b.id
     AND b.cycle_id = p_cycle_id
     AND bs.property_id = v_property_id
     AND bs.tenant_id = p_property_tenant_id
     AND bs.payment_status <> 'confirmed';
  GET DIAGNOSTICS v_count = ROW_COUNT;

  IF v_count = 0 THEN
    RAISE EXCEPTION 'Nothing to confirm for this tenant' USING ERRCODE = 'P0002';
  END IF;
  RETURN v_count;
END;
$$;

-- Owner: reopen a tenant's payment for a cycle (back to owed).
CREATE OR REPLACE FUNCTION public.reopen_tenant_cycle_payment(p_cycle_id UUID, p_property_tenant_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_property_id UUID;
  v_count INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not signed in' USING ERRCODE = '42501';
  END IF;

  SELECT property_id INTO v_property_id FROM public.billing_cycles WHERE id = p_cycle_id;
  IF v_property_id IS NULL OR NOT public.is_property_owner(v_property_id) THEN
    RAISE EXCEPTION 'Cycle not found' USING ERRCODE = '42501';
  END IF;

  UPDATE public.bill_splits bs
     SET payment_status = 'owed',
         marked_paid_at = NULL,
         confirmed_at = NULL,
         confirmed_by = NULL,
         payment_note = NULL
    FROM public.bills b
   WHERE bs.bill_id = b.id
     AND b.cycle_id = p_cycle_id
     AND bs.property_id = v_property_id
     AND bs.tenant_id = p_property_tenant_id
     AND bs.payment_status <> 'owed';
  GET DIAGNOSTICS v_count = ROW_COUNT;

  IF v_count = 0 THEN
    RAISE EXCEPTION 'Nothing to reopen for this tenant' USING ERRCODE = 'P0002';
  END IF;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_cycle_paid(UUID, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.unmark_cycle_paid(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.confirm_tenant_cycle_payment(UUID, UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reopen_tenant_cycle_payment(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_cycle_paid(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unmark_cycle_paid(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_tenant_cycle_payment(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reopen_tenant_cycle_payment(UUID, UUID) TO authenticated;
