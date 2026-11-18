-- Review fixes (2026-11-18). Additive and idempotent: safe to re-run.
--
-- 1. bills.cycle_id must belong to bills.property_id. The bills RLS policy only checks that the
--    caller owns property_id, so an owner could attach a bill to ANOTHER owner's cycle (it then
--    showed up in that cycle's server-side emails, which load bills by cycle_id).
-- 2. bill_splits rows must point at a bill and a tenant of the same property as property_id
--    (owners have FOR ALL on bill_splits by property_id only).
-- 3. End users cannot set or change property_tenants.tenant_id / claimed_at directly. Owners have
--    FOR ALL on property_tenants, so they could attach any registered user as an "active" tenant
--    (emailing them cycle bills and blocking their become_owner()). Linking a user now only
--    happens through claim_invite() (SECURITY DEFINER, so current_user is the function owner).
-- 4. Tenant-date recalculation (recalculate_property_splits) skips bills in CLOSED cycles:
--    closed cycles are final and their (possibly already paid/confirmed) amounts must not shift.
--    Reopening a cycle re-splits its bills (done by the reopenCycle server action).

-- ============================================================
-- 1. bills: cycle belongs to the same property
-- ============================================================
CREATE OR REPLACE FUNCTION public.enforce_bill_cycle_property()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.billing_cycles c
    WHERE c.id = NEW.cycle_id AND c.property_id = NEW.property_id
  ) THEN
    RAISE EXCEPTION 'Billing cycle does not belong to this property' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_bill_cycle_property ON public.bills;
CREATE TRIGGER enforce_bill_cycle_property
  BEFORE INSERT OR UPDATE OF cycle_id, property_id ON public.bills
  FOR EACH ROW EXECUTE FUNCTION public.enforce_bill_cycle_property();

-- ============================================================
-- 2. bill_splits: bill + tenant belong to the split's property
-- ============================================================
CREATE OR REPLACE FUNCTION public.enforce_bill_split_property()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.bills b WHERE b.id = NEW.bill_id AND b.property_id = NEW.property_id)
     OR NOT EXISTS (
       SELECT 1 FROM public.property_tenants pt WHERE pt.id = NEW.tenant_id AND pt.property_id = NEW.property_id
     ) THEN
    RAISE EXCEPTION 'Split bill/tenant do not belong to this property' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_bill_split_property ON public.bill_splits;
CREATE TRIGGER enforce_bill_split_property
  BEFORE INSERT OR UPDATE OF bill_id, tenant_id, property_id ON public.bill_splits
  FOR EACH ROW EXECUTE FUNCTION public.enforce_bill_split_property();

-- ============================================================
-- 3. property_tenants: only claim_invite() links a user account
-- ============================================================
-- SECURITY INVOKER on purpose: current_user is 'authenticated'/'anon' for PostgREST requests and
-- the function owner inside SECURITY DEFINER RPCs such as claim_invite().
CREATE OR REPLACE FUNCTION public.guard_property_tenant_link()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') AND NOT public.is_admin() THEN
    IF TG_OP = 'INSERT' THEN
      IF NEW.tenant_id IS NOT NULL OR NEW.claimed_at IS NOT NULL THEN
        RAISE EXCEPTION 'Tenants join by claiming their invite' USING ERRCODE = '42501';
      END IF;
    ELSIF NEW.tenant_id IS DISTINCT FROM OLD.tenant_id OR NEW.claimed_at IS DISTINCT FROM OLD.claimed_at THEN
      RAISE EXCEPTION 'Tenants join by claiming their invite' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_property_tenant_link ON public.property_tenants;
CREATE TRIGGER guard_property_tenant_link
  BEFORE INSERT OR UPDATE ON public.property_tenants
  FOR EACH ROW EXECUTE FUNCTION public.guard_property_tenant_link();

-- ============================================================
-- 4. Tenant-date recalculation leaves closed cycles alone
-- ============================================================
CREATE OR REPLACE FUNCTION public.recalculate_property_splits(p_property_id UUID, p_from DATE DEFAULT NULL)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bill_id UUID;
  v_count INTEGER := 0;
BEGIN
  IF NOT public.can_manage_property_splits(p_property_id) THEN
    RAISE EXCEPTION 'Not allowed to recalculate splits for this property' USING ERRCODE = '42501';
  END IF;
  FOR v_bill_id IN
    SELECT b.id FROM public.bills b
    JOIN public.billing_cycles c ON c.id = b.cycle_id
    WHERE b.property_id = p_property_id
      AND c.status <> 'closed'
      AND (p_from IS NULL OR b.service_end >= p_from)
    ORDER BY b.service_start, b.id
  LOOP
    PERFORM public.recalculate_bill_splits(v_bill_id);
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.recalculate_property_splits(UUID, DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.recalculate_property_splits(UUID, DATE) TO authenticated, service_role;
