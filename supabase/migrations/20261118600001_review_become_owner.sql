-- Review fix (2026-11-18): become_owner() must not undo an admin's decision.
-- An owner that a platform admin demoted to 'tenant' could call become_owner() and promote
-- themselves straight back (they have no tenancy rows). Refuse when an admin has ever changed
-- this account's role (audit_log 'change_role') or the account already owns/owned a property.
-- Otherwise identical to 20261118500000_owner_signup.sql. Idempotent.

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

  IF EXISTS (SELECT 1 FROM public.properties WHERE owner_id = v_uid)
     OR EXISTS (
       SELECT 1 FROM public.audit_log
       WHERE action = 'change_role' AND table_name = 'profiles' AND record_id = v_uid
     ) THEN
    RAISE EXCEPTION 'Your account role is managed by FairSplit support. Contact support to become a landlord.'
      USING ERRCODE = '42501';
  END IF;

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
