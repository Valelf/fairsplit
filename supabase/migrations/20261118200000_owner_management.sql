-- Owner management (2026-11-18)
-- Atomic split recalculation in the database. Mirrors lib/calculations/person-days.ts exactly:
--   * person-days = inclusive overlap of [service_start, service_end] with [join_date, leave_date]
--     (UTC calendar dates; every tenant row counts, whatever its status: invited/active/departed)
--   * floor(amount * days / total) per tenant, then the leftover cents go one each to the
--     largest remainders; ties: more person-days, then stable order (join_date, id)
--   * only tenants with > 0 person-days get a row
-- Splits are upserted on (bill_id, tenant_id) so any other columns on bill_splits (e.g. payment
-- status) survive a recalculation; rows for tenants who now have 0 days are deleted.
-- Additive and idempotent.

CREATE OR REPLACE FUNCTION public.can_manage_property_splits(p_property_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    -- service role and direct DB sessions are trusted (same rule as guard_profile_update)
    coalesce(auth.role(), '') NOT IN ('authenticated', 'anon')
    OR public.is_property_owner(p_property_id)
    OR public.is_admin();
$$;

CREATE OR REPLACE FUNCTION public.recalculate_bill_splits(p_bill_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bill public.bills%ROWTYPE;
  v_rows INTEGER;
BEGIN
  SELECT * INTO v_bill FROM public.bills WHERE id = p_bill_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bill not found' USING ERRCODE = 'P0002';
  END IF;
  IF NOT public.can_manage_property_splits(v_bill.property_id) THEN
    RAISE EXCEPTION 'Not allowed to recalculate splits for this property' USING ERRCODE = '42501';
  END IF;

  WITH t AS (
    SELECT
      pt.id,
      row_number() OVER (ORDER BY pt.join_date, pt.id) AS ord,
      greatest(
        0,
        least(v_bill.service_end, coalesce(pt.leave_date, v_bill.service_end))
          - greatest(v_bill.service_start, pt.join_date) + 1
      )::BIGINT AS pd
    FROM public.property_tenants pt
    WHERE pt.property_id = v_bill.property_id
  ),
  tot AS (SELECT coalesce(sum(pd), 0)::BIGINT AS total FROM t),
  s AS (
    SELECT t.id, t.ord, t.pd, tot.total,
           (v_bill.amount_cents::BIGINT * t.pd) / tot.total AS fl,
           (v_bill.amount_cents::BIGINT * t.pd) % tot.total AS rem
    FROM t, tot
    WHERE t.pd > 0 AND tot.total > 0
  ),
  lo AS (SELECT v_bill.amount_cents::BIGINT - coalesce(sum(fl), 0) AS leftover FROM s),
  r AS (
    SELECT s.*, row_number() OVER (ORDER BY s.rem DESC, s.pd DESC, s.ord) AS rk FROM s
  ),
  calc AS (
    SELECT r.id AS tenant_id, r.pd::INTEGER AS person_days, r.total::INTEGER AS total_person_days,
           (r.fl + CASE WHEN r.rk <= lo.leftover THEN 1 ELSE 0 END)::INTEGER AS amount_cents
    FROM r, lo
  ),
  -- tenants who no longer have any days on this bill lose their row
  del AS (
    DELETE FROM public.bill_splits bs
    WHERE bs.bill_id = p_bill_id
      AND NOT EXISTS (SELECT 1 FROM calc WHERE calc.tenant_id = bs.tenant_id)
    RETURNING 1
  )
  INSERT INTO public.bill_splits (bill_id, property_id, tenant_id, person_days, total_person_days, amount_cents)
  SELECT p_bill_id, v_bill.property_id, calc.tenant_id, calc.person_days, calc.total_person_days, calc.amount_cents
  FROM calc
  -- upsert, so other columns (payment status etc.) are preserved
  ON CONFLICT (bill_id, tenant_id) DO UPDATE
    SET person_days = EXCLUDED.person_days,
        total_person_days = EXCLUDED.total_person_days,
        amount_cents = EXCLUDED.amount_cents,
        property_id = EXCLUDED.property_id,
        updated_at = CASE
          WHEN bill_splits.person_days IS DISTINCT FROM EXCLUDED.person_days
            OR bill_splits.total_person_days IS DISTINCT FROM EXCLUDED.total_person_days
            OR bill_splits.amount_cents IS DISTINCT FROM EXCLUDED.amount_cents
          THEN now() ELSE bill_splits.updated_at END;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows;
END;
$$;

-- Recalculate every bill of a property; with p_from, only bills whose service period ends on or
-- after that date (i.e. bills a tenant-date change on/after p_from can affect).
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
    SELECT id FROM public.bills
    WHERE property_id = p_property_id
      AND (p_from IS NULL OR service_end >= p_from)
    ORDER BY service_start, id
  LOOP
    PERFORM public.recalculate_bill_splits(v_bill_id);
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.can_manage_property_splits(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_property_splits(UUID) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.recalculate_bill_splits(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.recalculate_bill_splits(UUID) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.recalculate_property_splits(UUID, DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.recalculate_property_splits(UUID, DATE) TO authenticated, service_role;
