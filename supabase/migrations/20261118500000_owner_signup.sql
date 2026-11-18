-- Owner self sign-up (2026-11-18)
-- New users always start as 'tenant' (see 20261118000001_security_hardening.sql) and cannot change
-- their own role. become_owner() is the one safe path for a brand-new landlord to promote themselves:
--   * only the signed-in user, only from role 'tenant'
--   * only if they have never been linked to a tenancy (no property_tenants rows), so an invited
--     tenant cannot silently turn themselves into an owner
--   * creates a Free plan subscription if they have none, and writes an audit_log row.
-- Idempotent: safe to re-run; calling it again as an owner is a no-op that returns 'owner'.

CREATE OR REPLACE FUNCTION public.become_owner()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_role TEXT;
  v_email TEXT;
  v_plan UUID;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not signed in' USING ERRCODE = '42501';
  END IF;

  SELECT role, email INTO v_role, v_email FROM public.profiles WHERE id = v_uid FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_role = 'owner' THEN
    RETURN 'owner';
  END IF;
  IF v_role <> 'tenant' THEN
    RAISE EXCEPTION 'Only new accounts can become landlords' USING ERRCODE = '42501';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.property_tenants
    WHERE tenant_id = v_uid OR lower(email) = lower(v_email)
  ) THEN
    RAISE EXCEPTION 'This account is linked to a tenancy. Use a different email to sign up as a landlord.'
      USING ERRCODE = '42501';
  END IF;

  -- Direct DB session inside SECURITY DEFINER: auth.role() is still 'authenticated', so the
  -- guard_profile_update trigger would block this. Bypass it for this one statement only.
  PERFORM set_config('fairsplit.allow_role_change', 'become_owner', true);
  UPDATE public.profiles SET role = 'owner', updated_at = now() WHERE id = v_uid;
  PERFORM set_config('fairsplit.allow_role_change', '', true);

  IF NOT EXISTS (SELECT 1 FROM public.user_subscriptions WHERE user_id = v_uid) THEN
    SELECT id INTO v_plan FROM public.subscription_plans WHERE name = 'Free' ORDER BY created_at LIMIT 1;
    IF v_plan IS NOT NULL THEN
      INSERT INTO public.user_subscriptions (user_id, plan_id, status) VALUES (v_uid, v_plan, 'active');
    END IF;
  END IF;

  INSERT INTO public.audit_log (user_id, action, table_name, record_id, old_data, new_data)
  VALUES (v_uid, 'become_owner', 'profiles', v_uid,
          jsonb_build_object('role', v_role), jsonb_build_object('role', 'owner'));

  RETURN 'owner';
END;
$$;

REVOKE ALL ON FUNCTION public.become_owner() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.become_owner() FROM anon;
GRANT EXECUTE ON FUNCTION public.become_owner() TO authenticated;

-- Let become_owner() through the role guard. The flag is transaction-local (set_config(..., true))
-- and only settable by code running in the same transaction; PostgREST clients can't set it
-- because they can only run SQL through RPCs and table endpoints.
CREATE OR REPLACE FUNCTION public.guard_profile_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF coalesce(auth.role(), '') IN ('authenticated', 'anon') AND NOT public.is_admin() THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      IF NOT (
        coalesce(current_setting('fairsplit.allow_role_change', true), '') = 'become_owner'
        AND OLD.role = 'tenant' AND NEW.role = 'owner' AND NEW.id = auth.uid()
      ) THEN
        RAISE EXCEPTION 'Only a platform admin can change roles' USING ERRCODE = '42501';
      END IF;
    END IF;
    IF NEW.email IS DISTINCT FROM OLD.email OR NEW.id IS DISTINCT FROM OLD.id THEN
      RAISE EXCEPTION 'Profile email and id cannot be changed' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
