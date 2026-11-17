-- FairSplit Seed Data: 575 McKinney Property
-- This seed file creates the complete demo data for development.
--
-- PREREQUISITES:
-- 1. Run migrations first (001_initial_schema.sql, 002_seed_plans.sql, 003_functions.sql)
-- 2. Create auth users via Supabase Auth (see STEP 1 below)
-- 3. Then run this seed file
--
-- The seed creates:
-- - 1 owner (Shekar)
-- - 5 tenants (Anil-departed, Navya, Vineesh, Val, Divya)
-- - 1 property (575 McKinney)
-- - 2 billing cycles (Sept-Oct, Oct-Nov)
-- - 6 bills (3 per cycle)
-- - 30 bill splits (pre-calculated person-days)

-- =============================================================================
-- STEP 1: Create Auth Users (Run via Supabase Dashboard or Admin API)
-- =============================================================================
-- These users must be created via Supabase Auth before running this SQL.
-- Use the Supabase Dashboard > Authentication > Users > Add User
-- OR use the Admin API: supabase.auth.admin.createUser()
--
-- Users to create:
-- 1. shekar@example.com (password: demo123!) - Owner
-- 2. anil@example.com (password: demo123!) - Tenant (departed)
-- 3. navya@example.com (password: demo123!) - Tenant
-- 4. vineesh@example.com (password: demo123!) - Tenant
-- 5. val@example.com (password: demo123!) - Tenant
-- 6. divya@example.com (password: demo123!) - Tenant

-- =============================================================================
-- STEP 2: Update Profile Roles
-- =============================================================================
-- After auth users are created, their profiles are auto-created with 'tenant' role.
-- Update Shekar's role to 'owner'.

UPDATE public.profiles
SET role = 'owner', full_name = 'Shekar'
WHERE email = 'shekar@example.com';

UPDATE public.profiles SET full_name = 'Anil' WHERE email = 'anil@example.com';
UPDATE public.profiles SET full_name = 'Navya' WHERE email = 'navya@example.com';
UPDATE public.profiles SET full_name = 'Vineesh' WHERE email = 'vineesh@example.com';
UPDATE public.profiles SET full_name = 'Val' WHERE email = 'val@example.com';
UPDATE public.profiles SET full_name = 'Divya' WHERE email = 'divya@example.com';

-- =============================================================================
-- STEP 3: Create Property
-- =============================================================================

INSERT INTO public.properties (
  id,
  owner_id,
  name,
  address_line1,
  city,
  state,
  zip_code,
  country,
  timezone,
  transparency_level
)
SELECT
  '00000000-0000-0000-0000-000000000001'::uuid,
  id,
  '575 McKinney',
  '575 McKinney',
  'McKinney',
  'TX',
  '75070',
  'US',
  'America/Chicago',
  'full'
FROM public.profiles
WHERE email = 'shekar@example.com';

-- =============================================================================
-- STEP 4: Add Tenants to Property
-- =============================================================================

-- Anil (departed Oct 30)
INSERT INTO public.property_tenants (
  id,
  property_id,
  tenant_id,
  email,
  display_name,
  join_date,
  leave_date,
  status
)
SELECT
  '00000000-0000-0000-0001-000000000001'::uuid,
  '00000000-0000-0000-0000-000000000001'::uuid,
  p.id,
  'anil@example.com',
  'Anil',
  '2025-01-01',
  '2025-10-30',
  'departed'
FROM public.profiles p
WHERE p.email = 'anil@example.com';

-- Navya (active, joined Oct 1)
INSERT INTO public.property_tenants (
  id,
  property_id,
  tenant_id,
  email,
  display_name,
  join_date,
  leave_date,
  status
)
SELECT
  '00000000-0000-0000-0001-000000000002'::uuid,
  '00000000-0000-0000-0000-000000000001'::uuid,
  p.id,
  'navya@example.com',
  'Navya',
  '2025-10-01',
  NULL,
  'active'
FROM public.profiles p
WHERE p.email = 'navya@example.com';

-- Vineesh (active, joined Oct 1)
INSERT INTO public.property_tenants (
  id,
  property_id,
  tenant_id,
  email,
  display_name,
  join_date,
  leave_date,
  status
)
SELECT
  '00000000-0000-0000-0001-000000000003'::uuid,
  '00000000-0000-0000-0000-000000000001'::uuid,
  p.id,
  'vineesh@example.com',
  'Vineesh',
  '2025-10-01',
  NULL,
  'active'
FROM public.profiles p
WHERE p.email = 'vineesh@example.com';

-- Val (active, joined Oct 11)
INSERT INTO public.property_tenants (
  id,
  property_id,
  tenant_id,
  email,
  display_name,
  join_date,
  leave_date,
  status
)
SELECT
  '00000000-0000-0000-0001-000000000004'::uuid,
  '00000000-0000-0000-0000-000000000001'::uuid,
  p.id,
  'val@example.com',
  'Val',
  '2025-10-11',
  NULL,
  'active'
FROM public.profiles p
WHERE p.email = 'val@example.com';

-- Divya (active, joined Nov 10)
INSERT INTO public.property_tenants (
  id,
  property_id,
  tenant_id,
  email,
  display_name,
  join_date,
  leave_date,
  status
)
SELECT
  '00000000-0000-0000-0001-000000000005'::uuid,
  '00000000-0000-0000-0000-000000000001'::uuid,
  p.id,
  'divya@example.com',
  'Divya',
  '2025-11-10',
  NULL,
  'active'
FROM public.profiles p
WHERE p.email = 'divya@example.com';

-- =============================================================================
-- STEP 5: Create Billing Cycles
-- =============================================================================

-- Sept – Oct Cycle (closed)
INSERT INTO public.billing_cycles (
  id,
  property_id,
  label,
  status,
  created_by
)
SELECT
  '00000000-0000-0000-0002-000000000001'::uuid,
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Sept – Oct',
  'closed',
  p.id
FROM public.profiles p
WHERE p.email = 'shekar@example.com';

-- Oct – Nov Cycle (closed)
INSERT INTO public.billing_cycles (
  id,
  property_id,
  label,
  status,
  created_by
)
SELECT
  '00000000-0000-0000-0002-000000000002'::uuid,
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Oct – Nov',
  'closed',
  p.id
FROM public.profiles p
WHERE p.email = 'shekar@example.com';

-- =============================================================================
-- STEP 6: Create Bills
-- =============================================================================

-- SEPT-OCT CYCLE BILLS

-- Bill 1: Internet (Spectrum) - $95.49
INSERT INTO public.bills (
  id,
  cycle_id,
  property_id,
  category,
  provider,
  amount_cents,
  service_start,
  service_end,
  source,
  created_by
)
SELECT
  '00000000-0000-0000-0003-000000000001'::uuid,
  '00000000-0000-0000-0002-000000000001'::uuid,
  '00000000-0000-0000-0000-000000000001'::uuid,
  'internet',
  'Spectrum',
  9549,
  '2025-09-16',
  '2025-10-15',
  'manual',
  p.id
FROM public.profiles p
WHERE p.email = 'shekar@example.com';

-- Bill 2: Electricity (CoServ) - $276.00
INSERT INTO public.bills (
  id,
  cycle_id,
  property_id,
  category,
  provider,
  amount_cents,
  service_start,
  service_end,
  source,
  created_by
)
SELECT
  '00000000-0000-0000-0003-000000000002'::uuid,
  '00000000-0000-0000-0002-000000000001'::uuid,
  '00000000-0000-0000-0000-000000000001'::uuid,
  'electricity',
  'CoServ',
  27600,
  '2025-09-15',
  '2025-10-14',
  'manual',
  p.id
FROM public.profiles p
WHERE p.email = 'shekar@example.com';

-- Bill 3: Water (City of McKinney) - $132.93
INSERT INTO public.bills (
  id,
  cycle_id,
  property_id,
  category,
  provider,
  amount_cents,
  service_start,
  service_end,
  source,
  created_by
)
SELECT
  '00000000-0000-0000-0003-000000000003'::uuid,
  '00000000-0000-0000-0002-000000000001'::uuid,
  '00000000-0000-0000-0000-000000000001'::uuid,
  'water',
  'City of McKinney',
  13293,
  '2025-09-16',
  '2025-10-21',
  'manual',
  p.id
FROM public.profiles p
WHERE p.email = 'shekar@example.com';

-- OCT-NOV CYCLE BILLS

-- Bill 4: Internet (Spectrum) - $95.49
INSERT INTO public.bills (
  id,
  cycle_id,
  property_id,
  category,
  provider,
  amount_cents,
  service_start,
  service_end,
  source,
  created_by
)
SELECT
  '00000000-0000-0000-0003-000000000004'::uuid,
  '00000000-0000-0000-0002-000000000002'::uuid,
  '00000000-0000-0000-0000-000000000001'::uuid,
  'internet',
  'Spectrum',
  9549,
  '2025-10-16',
  '2025-11-15',
  'manual',
  p.id
FROM public.profiles p
WHERE p.email = 'shekar@example.com';

-- Bill 5: Electricity (CoServ) - $220.00
INSERT INTO public.bills (
  id,
  cycle_id,
  property_id,
  category,
  provider,
  amount_cents,
  service_start,
  service_end,
  source,
  created_by
)
SELECT
  '00000000-0000-0000-0003-000000000005'::uuid,
  '00000000-0000-0000-0002-000000000002'::uuid,
  '00000000-0000-0000-0000-000000000001'::uuid,
  'electricity',
  'CoServ',
  22000,
  '2025-10-14',
  '2025-11-12',
  'manual',
  p.id
FROM public.profiles p
WHERE p.email = 'shekar@example.com';

-- Bill 6: Water (City of McKinney) - $113.59
INSERT INTO public.bills (
  id,
  cycle_id,
  property_id,
  category,
  provider,
  amount_cents,
  service_start,
  service_end,
  source,
  created_by
)
SELECT
  '00000000-0000-0000-0003-000000000006'::uuid,
  '00000000-0000-0000-0002-000000000002'::uuid,
  '00000000-0000-0000-0000-000000000001'::uuid,
  'water',
  'City of McKinney',
  11359,
  '2025-10-21',
  '2025-11-17',
  'manual',
  p.id
FROM public.profiles p
WHERE p.email = 'shekar@example.com';

-- =============================================================================
-- STEP 7: Create Bill Splits (Pre-calculated Person-Days)
-- =============================================================================
-- These are the verified splits from context/seed-data/575-mckinney-property-data.md

-- SEPT-OCT CYCLE SPLITS

-- Bill 1: Internet Splits
INSERT INTO public.bill_splits (bill_id, property_id, tenant_id, person_days, total_person_days, amount_cents)
VALUES
  ('00000000-0000-0000-0003-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0001-000000000001'::uuid, 30, 65, 4406),
  ('00000000-0000-0000-0003-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0001-000000000002'::uuid, 15, 65, 2204),
  ('00000000-0000-0000-0003-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0001-000000000003'::uuid, 15, 65, 2204),
  ('00000000-0000-0000-0003-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0001-000000000004'::uuid, 5, 65, 735),
  ('00000000-0000-0000-0003-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0001-000000000005'::uuid, 0, 65, 0);

-- Bill 2: Electricity Splits
INSERT INTO public.bill_splits (bill_id, property_id, tenant_id, person_days, total_person_days, amount_cents)
VALUES
  ('00000000-0000-0000-0003-000000000002'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0001-000000000001'::uuid, 30, 62, 13355),
  ('00000000-0000-0000-0003-000000000002'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0001-000000000002'::uuid, 14, 62, 6232),
  ('00000000-0000-0000-0003-000000000002'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0001-000000000003'::uuid, 14, 62, 6232),
  ('00000000-0000-0000-0003-000000000002'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0001-000000000004'::uuid, 4, 62, 1781),
  ('00000000-0000-0000-0003-000000000002'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0001-000000000005'::uuid, 0, 62, 0);

-- Bill 3: Water Splits
INSERT INTO public.bill_splits (bill_id, property_id, tenant_id, person_days, total_person_days, amount_cents)
VALUES
  ('00000000-0000-0000-0003-000000000003'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0001-000000000001'::uuid, 36, 89, 5376),
  ('00000000-0000-0000-0003-000000000003'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0001-000000000002'::uuid, 21, 89, 3137),
  ('00000000-0000-0000-0003-000000000003'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0001-000000000003'::uuid, 21, 89, 3137),
  ('00000000-0000-0000-0003-000000000003'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0001-000000000004'::uuid, 11, 89, 1643),
  ('00000000-0000-0000-0003-000000000003'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0001-000000000005'::uuid, 0, 89, 0);

-- OCT-NOV CYCLE SPLITS

-- Bill 4: Internet Splits
INSERT INTO public.bill_splits (bill_id, property_id, tenant_id, person_days, total_person_days, amount_cents)
VALUES
  ('00000000-0000-0000-0003-000000000004'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0001-000000000001'::uuid, 15, 114, 1256),
  ('00000000-0000-0000-0003-000000000004'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0001-000000000002'::uuid, 31, 114, 2597),
  ('00000000-0000-0000-0003-000000000004'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0001-000000000003'::uuid, 31, 114, 2597),
  ('00000000-0000-0000-0003-000000000004'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0001-000000000004'::uuid, 31, 114, 2597),
  ('00000000-0000-0000-0003-000000000004'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0001-000000000005'::uuid, 6, 114, 503);

-- Bill 5: Electricity Splits
INSERT INTO public.bill_splits (bill_id, property_id, tenant_id, person_days, total_person_days, amount_cents)
VALUES
  ('00000000-0000-0000-0003-000000000005'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0001-000000000001'::uuid, 17, 107, 3495),
  ('00000000-0000-0000-0003-000000000005'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0001-000000000002'::uuid, 29, 107, 5963),
  ('00000000-0000-0000-0003-000000000005'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0001-000000000003'::uuid, 29, 107, 5963),
  ('00000000-0000-0000-0003-000000000005'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0001-000000000004'::uuid, 29, 107, 5963),
  ('00000000-0000-0000-0003-000000000005'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0001-000000000005'::uuid, 3, 107, 617);

-- Bill 6: Water Splits
INSERT INTO public.bill_splits (bill_id, property_id, tenant_id, person_days, total_person_days, amount_cents)
VALUES
  ('00000000-0000-0000-0003-000000000006'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0001-000000000001'::uuid, 10, 102, 1114),
  ('00000000-0000-0000-0003-000000000006'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0001-000000000002'::uuid, 28, 102, 3118),
  ('00000000-0000-0000-0003-000000000006'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0001-000000000003'::uuid, 28, 102, 3118),
  ('00000000-0000-0000-0003-000000000006'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0001-000000000004'::uuid, 28, 102, 3118),
  ('00000000-0000-0000-0003-000000000006'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0001-000000000005'::uuid, 8, 102, 891);

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- Total billed should equal $933.50 (93350 cents)
-- SELECT SUM(amount_cents) as total_cents FROM public.bills;

-- Sept-Oct cycle should equal $504.42 (50442 cents)
-- SELECT SUM(amount_cents) as sept_oct_total FROM public.bills WHERE cycle_id = '00000000-0000-0000-0002-000000000001';

-- Oct-Nov cycle should equal $429.08 (42908 cents)
-- SELECT SUM(amount_cents) as oct_nov_total FROM public.bills WHERE cycle_id = '00000000-0000-0000-0002-000000000002';

-- Per-tenant totals:
-- SELECT
--   pt.display_name,
--   SUM(bs.amount_cents) as total_owed_cents
-- FROM public.bill_splits bs
-- JOIN public.property_tenants pt ON pt.id = bs.tenant_id
-- GROUP BY pt.display_name
-- ORDER BY total_owed_cents DESC;

-- Expected results:
-- Anil: $289.07 (28907 cents) - Departed Oct 30
-- Navya: $230.88 (23088 cents) - Active
-- Vineesh: $230.88 (23088 cents) - Active
-- Val: $156.74 (15674 cents) - Active
-- Divya: $19.94 (1994 cents) - Active (joined Nov 10)
