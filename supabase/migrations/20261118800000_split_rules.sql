-- Split rules (Phase 2, 2026-11-18). Additive and idempotent.
--   * bills.split_method: 'person_days' (default, the existing behaviour) or 'equal_present'
--     (equal shares among the tenants with >= 1 day in the service period).
--   * bill_split_exclusions: tenants left out of one bill (e.g. "has own internet plan").
--   * bill_splits.share_count: number of people sharing the bill; set only for 'equal_present'
--     (NULL for person_days bills, so their stored rows are untouched).
--   * recalculate_bill_splits honours both. Mirrors lib/calculations/person-days.ts
--     (calculateBillSplitCents with { method, excludedTenantIds }):
--       weight = person-days ('person_days') or 1 ('equal_present') for each non-excluded tenant
--       with > 0 days; floor(amount * weight / total_weight), leftover cents to the largest
--       remainders; ties: more person-days, then stable order (join_date, id).
--       person_days = the tenant's real days, total_person_days = the sharers' real days.
--       Excluded tenants (and tenants with 0 days) get no row; everyone excluded -> no rows.

ALTER TABLE public.bills
  ADD COLUMN IF NOT EXISTS split_method TEXT NOT NULL DEFAULT 'person_days';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bills_split_method_check'
  ) THEN
    ALTER TABLE public.bills
      ADD CONSTRAINT bills_split_method_check CHECK (split_method IN ('person_days', 'equal_present'));
  END IF;
END $$;

ALTER TABLE public.bill_splits
  ADD COLUMN IF NOT EXISTS share_count INTEGER;

CREATE TABLE IF NOT EXISTS public.bill_split_exclusions (
  bill_id UUID NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
  property_tenant_id UUID NOT NULL REFERENCES public.property_tenants(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id),
  reason TEXT CHECK (reason IS NULL OR char_length(reason) <= 200),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (bill_id, property_tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_bill_split_exclusions_property ON public.bill_split_exclusions(property_id);
CREATE INDEX IF NOT EXISTS idx_bill_split_exclusions_tenant ON public.bill_split_exclusions(property_tenant_id);

-- property_id always comes from the bill, and the tenant must live at that property.
CREATE OR REPLACE FUNCTION public.enforce_bill_split_exclusion_property()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_property UUID;
BEGIN
  SELECT property_id INTO v_property FROM public.bills WHERE id = NEW.bill_id;
  IF v_property IS NULL THEN
    RAISE EXCEPTION 'Bill not found' USING ERRCODE = 'P0002';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.property_tenants WHERE id = NEW.property_tenant_id AND property_id = v_property
  ) THEN
    RAISE EXCEPTION 'Tenant does not belong to this bill''s property' USING ERRCODE = '23514';
  END IF;
  NEW.property_id := v_property;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_bill_split_exclusion_property ON public.bill_split_exclusions;
CREATE TRIGGER enforce_bill_split_exclusion_property
  BEFORE INSERT OR UPDATE ON public.bill_split_exclusions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_bill_split_exclusion_property();

ALTER TABLE public.bill_split_exclusions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners manage split exclusions" ON public.bill_split_exclusions;
CREATE POLICY "Owners manage split exclusions"
  ON public.bill_split_exclusions FOR ALL
  USING (public.is_property_owner(property_id) OR public.is_admin())
  WITH CHECK (public.is_property_owner(property_id) OR public.is_admin());

DROP POLICY IF EXISTS "Tenants view split exclusions" ON public.bill_split_exclusions;
CREATE POLICY "Tenants view split exclusions"
  ON public.bill_split_exclusions FOR SELECT
  USING (public.is_property_tenant(property_id));

REVOKE ALL ON public.bill_split_exclusions FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bill_split_exclusions TO authenticated;
GRANT ALL ON public.bill_split_exclusions TO service_role;

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
  -- sharers: > 0 days and not excluded from this bill
  sh AS (
    SELECT t.id, t.ord, t.pd,
           CASE WHEN v_bill.split_method = 'equal_present' THEN 1 ELSE t.pd END::BIGINT AS w
    FROM t
    WHERE t.pd > 0
      AND NOT EXISTS (
        SELECT 1 FROM public.bill_split_exclusions e
        WHERE e.bill_id = p_bill_id AND e.property_tenant_id = t.id
      )
  ),
  tot AS (
    SELECT coalesce(sum(w), 0)::BIGINT AS total_w,
           coalesce(sum(pd), 0)::BIGINT AS total_pd,
           count(*)::INTEGER AS n
    FROM sh
  ),
  s AS (
    SELECT sh.id, sh.ord, sh.pd, tot.total_pd, tot.n,
           (v_bill.amount_cents::BIGINT * sh.w) / tot.total_w AS fl,
           (v_bill.amount_cents::BIGINT * sh.w) % tot.total_w AS rem
    FROM sh, tot
    WHERE tot.total_w > 0
  ),
  lo AS (SELECT v_bill.amount_cents::BIGINT - coalesce(sum(fl), 0) AS leftover FROM s),
  r AS (
    SELECT s.*, row_number() OVER (ORDER BY s.rem DESC, s.pd DESC, s.ord) AS rk FROM s
  ),
  calc AS (
    SELECT r.id AS tenant_id, r.pd::INTEGER AS person_days, r.total_pd::INTEGER AS total_person_days,
           (r.fl + CASE WHEN r.rk <= lo.leftover THEN 1 ELSE 0 END)::INTEGER AS amount_cents,
           CASE WHEN v_bill.split_method = 'equal_present' THEN r.n END AS share_count
    FROM r, lo
  ),
  -- tenants who no longer share this bill lose their row
  del AS (
    DELETE FROM public.bill_splits bs
    WHERE bs.bill_id = p_bill_id
      AND NOT EXISTS (SELECT 1 FROM calc WHERE calc.tenant_id = bs.tenant_id)
    RETURNING 1
  )
  INSERT INTO public.bill_splits (bill_id, property_id, tenant_id, person_days, total_person_days, amount_cents, share_count)
  SELECT p_bill_id, v_bill.property_id, calc.tenant_id, calc.person_days, calc.total_person_days, calc.amount_cents, calc.share_count
  FROM calc
  -- upsert, so other columns (payment status etc.) are preserved
  ON CONFLICT (bill_id, tenant_id) DO UPDATE
    SET person_days = EXCLUDED.person_days,
        total_person_days = EXCLUDED.total_person_days,
        amount_cents = EXCLUDED.amount_cents,
        share_count = EXCLUDED.share_count,
        property_id = EXCLUDED.property_id,
        updated_at = CASE
          WHEN bill_splits.person_days IS DISTINCT FROM EXCLUDED.person_days
            OR bill_splits.total_person_days IS DISTINCT FROM EXCLUDED.total_person_days
            OR bill_splits.amount_cents IS DISTINCT FROM EXCLUDED.amount_cents
            OR bill_splits.share_count IS DISTINCT FROM EXCLUDED.share_count
          THEN now() ELSE bill_splits.updated_at END;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows;
END;
$$;

REVOKE ALL ON FUNCTION public.recalculate_bill_splits(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.recalculate_bill_splits(UUID) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.enforce_bill_split_exclusion_property() FROM PUBLIC, anon, authenticated;
