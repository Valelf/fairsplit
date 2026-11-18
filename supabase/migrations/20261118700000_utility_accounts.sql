-- Phase 2: utility accounts (2026-11-18)
-- Owners set up each house's utility accounts once (Spectrum internet, CoServ electricity, ...)
-- and each month's bills pre-fill from them.
--
-- Additive and idempotent: safe to re-run.
--   * bills.category CHECK now also allows 'gas' and 'trash'
--   * utility_accounts table (+ RLS: owner manages, tenants of the property read, admin all)
--   * bills.utility_account_id nullable FK
--   * backfill: one account per distinct (property, category, provider) already billed.
--     Only inserts utility_accounts rows and links bills to them; bill amounts/dates untouched.
-- Only the last 4 digits of an account number are ever stored.

-- ============================================================
-- bills.category: add gas + trash
-- ============================================================
DO $$
DECLARE
  c record;
BEGIN
  -- Drop any existing CHECK on bills.category (auto-named in the initial schema) ...
  FOR c IN
    SELECT con.conname
      FROM pg_constraint con
     WHERE con.conrelid = 'public.bills'::regclass
       AND con.contype = 'c'
       AND pg_get_constraintdef(con.oid) ILIKE '%category%'
       AND con.conname <> 'bills_category_check_v2'
  LOOP
    EXECUTE format('ALTER TABLE public.bills DROP CONSTRAINT %I', c.conname);
  END LOOP;
  -- ... and replace it with the wider one.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bills_category_check_v2') THEN
    ALTER TABLE public.bills
      ADD CONSTRAINT bills_category_check_v2
      CHECK (category IN ('internet', 'electricity', 'water', 'gas', 'trash', 'other'));
  END IF;
END $$;

-- ============================================================
-- utility_accounts
-- ============================================================
CREATE TABLE IF NOT EXISTS public.utility_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  category TEXT NOT NULL
    CHECK (category IN ('internet', 'electricity', 'water', 'gas', 'trash', 'other')),
  provider TEXT NOT NULL CHECK (char_length(btrim(provider)) BETWEEN 1 AND 120),
  account_number_last4 TEXT CHECK (account_number_last4 IS NULL OR account_number_last4 ~ '^[0-9A-Za-z]{1,4}$'),
  typical_amount_cents INTEGER CHECK (typical_amount_cents IS NULL OR typical_amount_cents > 0),
  billing_day SMALLINT CHECK (billing_day IS NULL OR billing_day BETWEEN 1 AND 31),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_utility_accounts_property
  ON public.utility_accounts (property_id) WHERE deleted_at IS NULL;

ALTER TABLE public.utility_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners manage utility accounts" ON public.utility_accounts;
CREATE POLICY "Owners manage utility accounts"
  ON public.utility_accounts FOR ALL
  USING (public.is_property_owner(property_id))
  WITH CHECK (public.is_property_owner(property_id));

DROP POLICY IF EXISTS "Tenants view utility accounts" ON public.utility_accounts;
CREATE POLICY "Tenants view utility accounts"
  ON public.utility_accounts FOR SELECT
  USING (deleted_at IS NULL AND public.is_property_tenant(property_id));

DROP POLICY IF EXISTS "Admins manage utility accounts" ON public.utility_accounts;
CREATE POLICY "Admins manage utility accounts"
  ON public.utility_accounts FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

REVOKE ALL ON public.utility_accounts FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.utility_accounts TO authenticated;
GRANT ALL ON public.utility_accounts TO service_role;

-- ============================================================
-- bills.utility_account_id
-- ============================================================
ALTER TABLE public.bills
  ADD COLUMN IF NOT EXISTS utility_account_id UUID
    REFERENCES public.utility_accounts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_bills_utility_account
  ON public.bills (utility_account_id) WHERE utility_account_id IS NOT NULL;

-- ============================================================
-- Backfill: one account per (property, category, provider) already billed
-- ============================================================
INSERT INTO public.utility_accounts (property_id, category, provider, typical_amount_cents)
SELECT b.property_id, b.category, min(b.provider), round(avg(b.amount_cents))::int
  FROM public.bills b
  JOIN public.properties p ON p.id = b.property_id AND p.deleted_at IS NULL
 WHERE NOT EXISTS (
         SELECT 1 FROM public.utility_accounts ua
          WHERE ua.property_id = b.property_id
            AND ua.category = b.category
            AND lower(btrim(ua.provider)) = lower(btrim(b.provider))
       )
 GROUP BY b.property_id, b.category, lower(btrim(b.provider));

-- Linking is bookkeeping only: keep bills.updated_at as it was.
ALTER TABLE public.bills DISABLE TRIGGER set_updated_at;
UPDATE public.bills b
   SET utility_account_id = ua.id
  FROM public.utility_accounts ua
 WHERE b.utility_account_id IS NULL
   AND ua.property_id = b.property_id
   AND ua.category = b.category
   AND lower(btrim(ua.provider)) = lower(btrim(b.provider))
   AND ua.deleted_at IS NULL;

ALTER TABLE public.bills ENABLE TRIGGER set_updated_at;
