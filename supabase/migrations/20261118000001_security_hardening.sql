-- Phase 0 security hardening (2026-11-18)
-- Fixes found in the code audit:
--   1. Users could promote themselves to admin (profiles UPDATE policy had no column guard).
--   2. handle_new_user trusted the client-supplied `role` in sign-up metadata.
--   3. INSERT policies WITH CHECK (true) on profiles / notifications / audit_log were open to
--      every authenticated user (they were meant for the service role, which bypasses RLS anyway).
--   4. Tenants could flag bills on any property.
--   5. Departed tenants kept seeing every new bill on the property forever.
--   6. Duplicate / unused helper overloads from 003.
-- Also adds data-integrity constraints, invite expiry, cycle dates, and claim-invite RPCs.

-- ============================================================
-- 1 + 2. Profiles: lock role/email, ignore role from sign-up metadata
-- ============================================================
DROP POLICY IF EXISTS "Service role can insert profiles" ON public.profiles;

CREATE OR REPLACE FUNCTION public.guard_profile_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only end-user requests are restricted; service role and direct DB sessions are trusted.
  IF coalesce(auth.role(), '') IN ('authenticated', 'anon') AND NOT public.is_admin() THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'Only a platform admin can change roles' USING ERRCODE = '42501';
    END IF;
    IF NEW.email IS DISTINCT FROM OLD.email OR NEW.id IS DISTINCT FROM OLD.id THEN
      RAISE EXCEPTION 'Profile email and id cannot be changed' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_profile_update ON public.profiles;
CREATE TRIGGER guard_profile_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_update();

-- New users always start as tenants. Owners/admins are promoted by a platform admin
-- (or by trusted server code using the service role).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), split_part(NEW.email, '@', 1)),
    'tenant'
  );
  RETURN NEW;
END;
$$;

-- ============================================================
-- 3. Close open INSERT policies
-- ============================================================
DROP POLICY IF EXISTS "Service role can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Service role can insert audit log" ON public.audit_log;

CREATE POLICY "Admins can insert audit log"
  ON public.audit_log FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- ============================================================
-- 5. Tenant visibility limited to their stay (+ bills that overlap it)
-- ============================================================
CREATE OR REPLACE FUNCTION public.tenant_can_see_period(p_property_id UUID, p_service_start DATE)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.property_tenants pt
    WHERE pt.property_id = p_property_id
      AND pt.tenant_id = auth.uid()
      AND pt.status IN ('active', 'departed')
      AND (pt.leave_date IS NULL OR p_service_start <= pt.leave_date)
  );
$$;

CREATE OR REPLACE FUNCTION public.tenant_can_see_bill(p_bill_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.bills b
    WHERE b.id = p_bill_id
      AND public.tenant_can_see_period(b.property_id, b.service_start)
  );
$$;

DROP POLICY IF EXISTS "Tenants can view bills for their properties" ON public.bills;
CREATE POLICY "Tenants can view bills for their properties"
  ON public.bills FOR SELECT
  USING (public.tenant_can_see_period(property_id, service_start));

DROP POLICY IF EXISTS "Tenants can view all splits in full transparency" ON public.bill_splits;
CREATE POLICY "Tenants can view all splits in full transparency"
  ON public.bill_splits FOR SELECT
  USING (
    public.tenant_can_see_bill(bill_id)
    AND EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = bill_splits.property_id
        AND p.transparency_level = 'full'
    )
  );

-- ============================================================
-- 4. Flags: only on bills the tenant can see, as themselves
-- ============================================================
DROP POLICY IF EXISTS "Tenants can create flags" ON public.bill_flags;
CREATE POLICY "Tenants can create flags"
  ON public.bill_flags FOR INSERT
  TO authenticated
  WITH CHECK (
    flagged_by = auth.uid()
    AND public.tenant_can_see_bill(bill_id)
    AND EXISTS (
      SELECT 1 FROM public.property_tenants pt
      WHERE pt.id = bill_flags.tenant_id
        AND pt.tenant_id = auth.uid()
        AND pt.property_id = bill_flags.property_id
    )
    AND EXISTS (
      SELECT 1 FROM public.bills b
      WHERE b.id = bill_flags.bill_id AND b.property_id = bill_flags.property_id
    )
  );

-- Deleting a bill removes its flags instead of failing.
ALTER TABLE public.bill_flags DROP CONSTRAINT IF EXISTS bill_flags_bill_id_fkey;
ALTER TABLE public.bill_flags
  ADD CONSTRAINT bill_flags_bill_id_fkey
  FOREIGN KEY (bill_id) REFERENCES public.bills(id) ON DELETE CASCADE;

-- ============================================================
-- 6. Remove duplicate / unused helpers
-- ============================================================
DROP FUNCTION IF EXISTS public.is_property_owner(UUID, UUID);
DROP FUNCTION IF EXISTS public.is_property_tenant(UUID, UUID);
DROP FUNCTION IF EXISTS public.get_user_role(UUID);
DROP FUNCTION IF EXISTS public.get_property_transparency(UUID);

-- Owner helper ignores soft-deleted properties.
CREATE OR REPLACE FUNCTION public.is_property_owner(p_property_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.properties
    WHERE id = p_property_id AND owner_id = auth.uid() AND deleted_at IS NULL
  );
$$;

-- ============================================================
-- Data integrity
-- ============================================================
ALTER TABLE public.bills
  ADD CONSTRAINT bills_amount_nonnegative CHECK (amount_cents >= 0),
  ADD CONSTRAINT bills_service_period_valid CHECK (service_start <= service_end);

ALTER TABLE public.bill_splits
  ADD CONSTRAINT bill_splits_amount_nonnegative CHECK (amount_cents >= 0);

ALTER TABLE public.property_tenants
  ADD CONSTRAINT property_tenants_dates_valid CHECK (leave_date IS NULL OR join_date <= leave_date);

CREATE UNIQUE INDEX IF NOT EXISTS idx_property_tenants_unique_email
  ON public.property_tenants (property_id, lower(email))
  WHERE status <> 'departed';

-- Cycles get real dates (nullable for existing rows; the UI fills them going forward).
ALTER TABLE public.billing_cycles
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date DATE,
  ADD CONSTRAINT billing_cycles_dates_valid CHECK (start_date IS NULL OR end_date IS NULL OR start_date <= end_date);

-- ============================================================
-- Invites: expiry + safe lookup/claim RPCs
-- ============================================================
ALTER TABLE public.property_tenants
  ADD COLUMN IF NOT EXISTS invite_expires_at TIMESTAMPTZ DEFAULT (now() + interval '30 days');

-- Public lookup for the claim page. Returns only what the invitee needs to see.
CREATE OR REPLACE FUNCTION public.get_invite(p_token UUID)
RETURNS TABLE (property_name TEXT, display_name TEXT, email TEXT, invite_status TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.name,
    pt.display_name,
    pt.email,
    CASE
      WHEN pt.claimed_at IS NOT NULL THEN 'claimed'
      WHEN pt.status = 'departed' THEN 'invalid'
      WHEN pt.invite_expires_at IS NOT NULL AND pt.invite_expires_at < now() THEN 'expired'
      ELSE 'valid'
    END
  FROM public.property_tenants pt
  JOIN public.properties p ON p.id = pt.property_id AND p.deleted_at IS NULL
  WHERE pt.invite_token = p_token;
$$;

-- Claim: the signed-in user's verified email must match the invite.
CREATE OR REPLACE FUNCTION public.claim_invite(p_token UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.property_tenants%ROWTYPE;
  v_email TEXT;
  v_confirmed TIMESTAMPTZ;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not signed in' USING ERRCODE = '42501';
  END IF;

  SELECT email, email_confirmed_at INTO v_email, v_confirmed FROM auth.users WHERE id = auth.uid();
  IF v_confirmed IS NULL THEN
    RAISE EXCEPTION 'Email not verified' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_row FROM public.property_tenants WHERE invite_token = p_token FOR UPDATE;
  IF NOT FOUND OR v_row.status = 'departed' THEN
    RAISE EXCEPTION 'Invite not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_row.claimed_at IS NOT NULL THEN
    IF v_row.tenant_id = auth.uid() THEN
      RETURN v_row.property_id; -- idempotent re-claim
    END IF;
    RAISE EXCEPTION 'Invite already claimed' USING ERRCODE = '42501';
  END IF;
  IF v_row.invite_expires_at IS NOT NULL AND v_row.invite_expires_at < now() THEN
    RAISE EXCEPTION 'Invite expired' USING ERRCODE = '42501';
  END IF;
  IF lower(v_row.email) <> lower(v_email) THEN
    RAISE EXCEPTION 'This invite was sent to a different email address' USING ERRCODE = '42501';
  END IF;

  UPDATE public.property_tenants
     SET tenant_id = auth.uid(), claimed_at = now(), status = 'active'
   WHERE id = v_row.id;

  RETURN v_row.property_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_invite(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_invite(UUID) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_invite(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_invite(UUID) TO authenticated;
