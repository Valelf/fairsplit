# FairSplit Database Schema & Migrations

> Complete database schema specification for all 11 tables, including CREATE TABLE statements,
> indexes, Row Level Security policies, trigger functions, and migration workflow.

---

## Table of Contents

1. [Migration File Structure](#migration-file-structure)
2. [Shared Utilities (Triggers & Functions)](#shared-utilities)
3. [Table Definitions](#table-definitions)
   - profiles
   - subscription_plans
   - user_subscriptions
   - properties
   - property_tenants
   - billing_cycles
   - bills
   - bill_splits
   - bill_flags
   - notifications
   - audit_log
4. [Index Summary](#index-summary)
5. [RLS Policy Summary](#rls-policy-summary)
6. [Seed Data Migration](#seed-data-migration)

---

## Migration File Structure

All SQL migrations live in `supabase/migrations/` and are executed in lexicographic order. The
recommended naming convention is `YYYYMMDDHHMMSS_description.sql`.

```
supabase/
  migrations/
    20250101000000_create_profiles.sql
    20250101000001_create_subscription_plans.sql
    20250101000002_create_user_subscriptions.sql
    20250101000003_create_properties.sql
    20250101000004_create_property_tenants.sql
    20250101000005_create_billing_cycles.sql
    20250101000006_create_bills.sql
    20250101000007_create_bill_splits.sql
    20250101000008_create_bill_flags.sql
    20250101000009_create_notifications.sql
    20250101000010_create_audit_log.sql
    20250101000011_create_indexes.sql
    20250101000012_enable_rls_policies.sql
    20250101000013_seed_575_mckinney.sql
  seed.sql
  config.toml
```

---

## Shared Utilities

### updated_at Trigger Function

Every table that has an `updated_at` column uses a shared trigger function to keep it current
on every UPDATE.

```sql
-- Migration: 20250101000000_create_profiles.sql (top of first migration)

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Profile Auto-Creation on Auth Signup

When a user signs up through Supabase Auth, automatically insert a row in `profiles`.

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'tenant')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

### Helper: Check if User Is Admin

```sql
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
```

### Helper: Check if User Owns a Property

```sql
CREATE OR REPLACE FUNCTION public.is_property_owner(prop_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.properties
    WHERE id = prop_id AND owner_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
```

### Helper: Check if User Is Tenant of a Property

```sql
CREATE OR REPLACE FUNCTION public.is_property_tenant(prop_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.property_tenants
    WHERE property_id = prop_id
      AND tenant_id = auth.uid()
      AND status IN ('active', 'departed')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
```

---

## Table Definitions

### 1. profiles

Extends `auth.users` with application-specific fields. The primary key references the Supabase
Auth user ID directly.

```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'owner', 'tenant')) DEFAULT 'tenant',
  avatar_url TEXT,
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Admins: full access
CREATE POLICY "admin_full_access_profiles" ON public.profiles
  FOR ALL USING (public.is_admin());

-- Users: can read their own profile
CREATE POLICY "users_read_own_profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- Users: can update their own profile (but not role)
CREATE POLICY "users_update_own_profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND role = (SELECT role FROM public.profiles WHERE id = auth.uid()));

-- Owners: can read profiles of tenants in their properties
CREATE POLICY "owners_read_tenant_profiles" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.property_tenants pt
      JOIN public.properties p ON pt.property_id = p.id
      WHERE pt.tenant_id = profiles.id
        AND p.owner_id = auth.uid()
    )
  );
```

**Indexes:**

```sql
CREATE INDEX idx_profiles_email ON public.profiles (email);
CREATE INDEX idx_profiles_role ON public.profiles (role);
```

---

### 2. subscription_plans

Monetization scaffold for future Stripe integration. Defines plan tiers with usage limits.

```sql
CREATE TABLE public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  max_properties INTEGER NOT NULL DEFAULT 1,
  max_tenants_per_property INTEGER NOT NULL DEFAULT 5,
  max_bills_per_month INTEGER NOT NULL DEFAULT 10,
  price_cents INTEGER NOT NULL DEFAULT 0,
  stripe_price_id TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read active plans
CREATE POLICY "authenticated_read_active_plans" ON public.subscription_plans
  FOR SELECT USING (is_active = true);

-- Admins: full access
CREATE POLICY "admin_full_access_plans" ON public.subscription_plans
  FOR ALL USING (public.is_admin());
```

---

### 3. user_subscriptions

Links users to subscription plans. Tracks Stripe customer and subscription IDs for billing.

```sql
CREATE TABLE public.user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.subscription_plans(id),
  status TEXT NOT NULL CHECK (status IN ('active', 'canceled', 'past_due')) DEFAULT 'active',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER set_user_subscriptions_updated_at
  BEFORE UPDATE ON public.user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users: read own subscription
CREATE POLICY "users_read_own_subscription" ON public.user_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- Admins: full access
CREATE POLICY "admin_full_access_subscriptions" ON public.user_subscriptions
  FOR ALL USING (public.is_admin());
```

**Indexes:**

```sql
CREATE INDEX idx_user_subscriptions_user_id ON public.user_subscriptions (user_id);
CREATE INDEX idx_user_subscriptions_status ON public.user_subscriptions (status);
```

---

### 4. properties

A property is the central entity. Each property belongs to one owner and has its own set of
tenants, billing cycles, and bills. The `deleted_at` column supports soft deletes.

```sql
CREATE TABLE public.properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip_code TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'US',
  timezone TEXT NOT NULL DEFAULT 'America/Chicago',
  transparency_level TEXT NOT NULL CHECK (transparency_level IN ('full', 'own_share')) DEFAULT 'full',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TRIGGER set_properties_updated_at
  BEFORE UPDATE ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- Admins: full access
CREATE POLICY "admin_full_access_properties" ON public.properties
  FOR ALL USING (public.is_admin());

-- Owners: CRUD on own properties
CREATE POLICY "owners_manage_own_properties" ON public.properties
  FOR ALL USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Tenants: read properties they belong to (not soft-deleted)
CREATE POLICY "tenants_read_own_properties" ON public.properties
  FOR SELECT USING (
    deleted_at IS NULL
    AND public.is_property_tenant(id)
  );
```

**Indexes:**

```sql
CREATE INDEX idx_properties_owner_id ON public.properties (owner_id);
CREATE INDEX idx_properties_deleted_at ON public.properties (deleted_at) WHERE deleted_at IS NULL;
```

---

### 5. property_tenants

Join table linking tenant profiles to properties. Tracks occupancy dates, invitation state,
and claim tokens. A tenant may not have a `tenant_id` yet if they were pre-created by the owner
before claiming their invite.

```sql
CREATE TABLE public.property_tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.profiles(id),
  email TEXT NOT NULL,
  display_name TEXT NOT NULL,
  join_date DATE NOT NULL,
  leave_date DATE,
  status TEXT NOT NULL CHECK (status IN ('invited', 'active', 'departed')) DEFAULT 'invited',
  invite_token UUID DEFAULT gen_random_uuid(),
  invited_at TIMESTAMPTZ DEFAULT now(),
  claimed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER set_property_tenants_updated_at
  BEFORE UPDATE ON public.property_tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.property_tenants ENABLE ROW LEVEL SECURITY;

-- Admins: full access
CREATE POLICY "admin_full_access_property_tenants" ON public.property_tenants
  FOR ALL USING (public.is_admin());

-- Owners: manage tenants in their own properties
CREATE POLICY "owners_manage_property_tenants" ON public.property_tenants
  FOR ALL USING (public.is_property_owner(property_id))
  WITH CHECK (public.is_property_owner(property_id));

-- Tenants: read their own property_tenant records
CREATE POLICY "tenants_read_own_records" ON public.property_tenants
  FOR SELECT USING (
    tenant_id = auth.uid()
    OR public.is_property_tenant(property_id)
  );

-- Public: allow claim by invite token (unauthenticated read for claim flow)
CREATE POLICY "claim_invite_by_token" ON public.property_tenants
  FOR SELECT USING (invite_token IS NOT NULL AND status = 'invited');
```

**Indexes:**

```sql
CREATE INDEX idx_property_tenants_property_id ON public.property_tenants (property_id);
CREATE INDEX idx_property_tenants_tenant_id ON public.property_tenants (tenant_id);
CREATE INDEX idx_property_tenants_email ON public.property_tenants (email);
CREATE INDEX idx_property_tenants_invite_token ON public.property_tenants (invite_token) WHERE status = 'invited';
CREATE INDEX idx_property_tenants_status ON public.property_tenants (status);
```

---

### 6. billing_cycles

Grouping container for bills. Each cycle belongs to a property and progresses through
draft -> open -> closed states.

```sql
CREATE TABLE public.billing_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'open', 'closed')) DEFAULT 'draft',
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER set_billing_cycles_updated_at
  BEFORE UPDATE ON public.billing_cycles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.billing_cycles ENABLE ROW LEVEL SECURITY;

-- Admins: full access
CREATE POLICY "admin_full_access_cycles" ON public.billing_cycles
  FOR ALL USING (public.is_admin());

-- Owners: manage cycles for their properties
CREATE POLICY "owners_manage_cycles" ON public.billing_cycles
  FOR ALL USING (public.is_property_owner(property_id))
  WITH CHECK (public.is_property_owner(property_id));

-- Tenants: read cycles for their properties
CREATE POLICY "tenants_read_cycles" ON public.billing_cycles
  FOR SELECT USING (public.is_property_tenant(property_id));
```

**Indexes:**

```sql
CREATE INDEX idx_billing_cycles_property_id ON public.billing_cycles (property_id);
CREATE INDEX idx_billing_cycles_status ON public.billing_cycles (status);
CREATE INDEX idx_billing_cycles_created_by ON public.billing_cycles (created_by);
```

---

### 7. bills

Individual utility bills within a cycle. The `property_id` is denormalized from the cycle for
efficient RLS. All monetary values are stored as integers (cents).

```sql
CREATE TABLE public.bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID NOT NULL REFERENCES public.billing_cycles(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id),
  category TEXT NOT NULL CHECK (category IN ('internet', 'electricity', 'water', 'other')),
  provider TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  service_start DATE NOT NULL,
  service_end DATE NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('manual', 'pdf_parsed')) DEFAULT 'manual',
  pdf_storage_path TEXT,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT bills_service_dates_valid CHECK (service_end >= service_start),
  CONSTRAINT bills_amount_positive CHECK (amount_cents > 0)
);

CREATE TRIGGER set_bills_updated_at
  BEFORE UPDATE ON public.bills
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;

-- Admins: full access
CREATE POLICY "admin_full_access_bills" ON public.bills
  FOR ALL USING (public.is_admin());

-- Owners: manage bills for their properties
CREATE POLICY "owners_manage_bills" ON public.bills
  FOR ALL USING (public.is_property_owner(property_id))
  WITH CHECK (public.is_property_owner(property_id));

-- Tenants: read bills for their properties
CREATE POLICY "tenants_read_bills" ON public.bills
  FOR SELECT USING (public.is_property_tenant(property_id));
```

**Indexes:**

```sql
CREATE INDEX idx_bills_cycle_id ON public.bills (cycle_id);
CREATE INDEX idx_bills_property_id ON public.bills (property_id);
CREATE INDEX idx_bills_category ON public.bills (category);
CREATE INDEX idx_bills_service_dates ON public.bills (service_start, service_end);
```

---

### 8. bill_splits

Pre-calculated per-bill, per-tenant split records. Computed when a bill is created or updated
using the person-days algorithm. The `UNIQUE(bill_id, tenant_id)` constraint prevents
duplicate entries.

```sql
CREATE TABLE public.bill_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id),
  tenant_id UUID NOT NULL REFERENCES public.property_tenants(id),
  person_days INTEGER NOT NULL DEFAULT 0,
  total_person_days INTEGER NOT NULL DEFAULT 0,
  amount_cents INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT bill_splits_unique UNIQUE (bill_id, tenant_id),
  CONSTRAINT bill_splits_person_days_non_negative CHECK (person_days >= 0),
  CONSTRAINT bill_splits_amount_non_negative CHECK (amount_cents >= 0)
);

CREATE TRIGGER set_bill_splits_updated_at
  BEFORE UPDATE ON public.bill_splits
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.bill_splits ENABLE ROW LEVEL SECURITY;

-- Admins: full access
CREATE POLICY "admin_full_access_splits" ON public.bill_splits
  FOR ALL USING (public.is_admin());

-- Owners: manage splits for their properties
CREATE POLICY "owners_manage_splits" ON public.bill_splits
  FOR ALL USING (public.is_property_owner(property_id))
  WITH CHECK (public.is_property_owner(property_id));

-- Tenants: read splits for their properties
-- (transparency_level filtering is handled at the application layer)
CREATE POLICY "tenants_read_splits" ON public.bill_splits
  FOR SELECT USING (public.is_property_tenant(property_id));
```

**Indexes:**

```sql
CREATE INDEX idx_bill_splits_bill_id ON public.bill_splits (bill_id);
CREATE INDEX idx_bill_splits_property_id ON public.bill_splits (property_id);
CREATE INDEX idx_bill_splits_tenant_id ON public.bill_splits (tenant_id);
```

---

### 9. bill_flags

Tenants can flag a bill for review by the owner. Tracks the lifecycle from open through
resolution or dismissal.

```sql
CREATE TABLE public.bill_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id),
  tenant_id UUID NOT NULL REFERENCES public.property_tenants(id),
  flagged_by UUID NOT NULL REFERENCES public.profiles(id),
  reason TEXT NOT NULL,
  suggested_amount_cents INTEGER,
  status TEXT NOT NULL CHECK (status IN ('open', 'under_review', 'resolved', 'dismissed')) DEFAULT 'open',
  resolution_note TEXT,
  resolved_by UUID REFERENCES public.profiles(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER set_bill_flags_updated_at
  BEFORE UPDATE ON public.bill_flags
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.bill_flags ENABLE ROW LEVEL SECURITY;

-- Admins: full access
CREATE POLICY "admin_full_access_flags" ON public.bill_flags
  FOR ALL USING (public.is_admin());

-- Owners: read and update flags for their properties
CREATE POLICY "owners_manage_flags" ON public.bill_flags
  FOR ALL USING (public.is_property_owner(property_id))
  WITH CHECK (public.is_property_owner(property_id));

-- Tenants: create flags and read their own flags
CREATE POLICY "tenants_create_flags" ON public.bill_flags
  FOR INSERT WITH CHECK (
    auth.uid() = flagged_by
    AND public.is_property_tenant(property_id)
  );

CREATE POLICY "tenants_read_own_flags" ON public.bill_flags
  FOR SELECT USING (
    flagged_by = auth.uid()
    OR public.is_property_owner(property_id)
  );
```

**Indexes:**

```sql
CREATE INDEX idx_bill_flags_bill_id ON public.bill_flags (bill_id);
CREATE INDEX idx_bill_flags_property_id ON public.bill_flags (property_id);
CREATE INDEX idx_bill_flags_tenant_id ON public.bill_flags (tenant_id);
CREATE INDEX idx_bill_flags_flagged_by ON public.bill_flags (flagged_by);
CREATE INDEX idx_bill_flags_status ON public.bill_flags (status);
```

---

### 10. notifications

In-app notification records. Supabase Realtime is enabled on this table so the client can
subscribe to new notification inserts for the current user.

```sql
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  metadata JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Admins: full access
CREATE POLICY "admin_full_access_notifications" ON public.notifications
  FOR ALL USING (public.is_admin());

-- Users: read and update (mark as read) their own notifications
CREATE POLICY "users_read_own_notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users_update_own_notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service role inserts notifications (no user INSERT policy needed)
```

**Indexes:**

```sql
CREATE INDEX idx_notifications_user_id ON public.notifications (user_id);
CREATE INDEX idx_notifications_is_read ON public.notifications (is_read) WHERE is_read = false;
CREATE INDEX idx_notifications_created_at ON public.notifications (created_at DESC);
```

---

### 11. audit_log

Append-only audit trail for all mutations. Written by server actions using the service role
client. No user should be able to modify or delete audit records.

```sql
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id),
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Admins: read-only access
CREATE POLICY "admin_read_audit_log" ON public.audit_log
  FOR SELECT USING (public.is_admin());

-- No INSERT/UPDATE/DELETE policies for regular users.
-- Inserts are performed via the service role client (bypasses RLS).
```

**Indexes:**

```sql
CREATE INDEX idx_audit_log_user_id ON public.audit_log (user_id);
CREATE INDEX idx_audit_log_table_name ON public.audit_log (table_name);
CREATE INDEX idx_audit_log_record_id ON public.audit_log (record_id);
CREATE INDEX idx_audit_log_created_at ON public.audit_log (created_at DESC);
```

---

## Index Summary

| Table               | Index Name                              | Columns                      | Condition                  |
|---------------------|-----------------------------------------|------------------------------|----------------------------|
| profiles            | idx_profiles_email                      | email                        |                            |
| profiles            | idx_profiles_role                       | role                         |                            |
| user_subscriptions  | idx_user_subscriptions_user_id          | user_id                      |                            |
| user_subscriptions  | idx_user_subscriptions_status           | status                       |                            |
| properties          | idx_properties_owner_id                 | owner_id                     |                            |
| properties          | idx_properties_deleted_at               | deleted_at                   | WHERE deleted_at IS NULL   |
| property_tenants    | idx_property_tenants_property_id        | property_id                  |                            |
| property_tenants    | idx_property_tenants_tenant_id          | tenant_id                    |                            |
| property_tenants    | idx_property_tenants_email              | email                        |                            |
| property_tenants    | idx_property_tenants_invite_token       | invite_token                 | WHERE status = 'invited'   |
| property_tenants    | idx_property_tenants_status             | status                       |                            |
| billing_cycles      | idx_billing_cycles_property_id          | property_id                  |                            |
| billing_cycles      | idx_billing_cycles_status               | status                       |                            |
| billing_cycles      | idx_billing_cycles_created_by           | created_by                   |                            |
| bills               | idx_bills_cycle_id                      | cycle_id                     |                            |
| bills               | idx_bills_property_id                   | property_id                  |                            |
| bills               | idx_bills_category                      | category                     |                            |
| bills               | idx_bills_service_dates                 | service_start, service_end   |                            |
| bill_splits         | idx_bill_splits_bill_id                 | bill_id                      |                            |
| bill_splits         | idx_bill_splits_property_id             | property_id                  |                            |
| bill_splits         | idx_bill_splits_tenant_id               | tenant_id                    |                            |
| bill_flags          | idx_bill_flags_bill_id                  | bill_id                      |                            |
| bill_flags          | idx_bill_flags_property_id              | property_id                  |                            |
| bill_flags          | idx_bill_flags_tenant_id                | tenant_id                    |                            |
| bill_flags          | idx_bill_flags_flagged_by               | flagged_by                   |                            |
| bill_flags          | idx_bill_flags_status                   | status                       |                            |
| notifications       | idx_notifications_user_id               | user_id                      |                            |
| notifications       | idx_notifications_is_read               | is_read                      | WHERE is_read = false      |
| notifications       | idx_notifications_created_at            | created_at DESC              |                            |
| audit_log           | idx_audit_log_user_id                   | user_id                      |                            |
| audit_log           | idx_audit_log_table_name                | table_name                   |                            |
| audit_log           | idx_audit_log_record_id                 | record_id                    |                            |
| audit_log           | idx_audit_log_created_at                | created_at DESC              |                            |

---

## RLS Policy Summary

| Table              | Policy Name                            | Operation    | Who                       | Condition Summary                                    |
|--------------------|----------------------------------------|-------------|---------------------------|------------------------------------------------------|
| profiles           | admin_full_access_profiles             | ALL         | Admin                     | is_admin()                                           |
| profiles           | users_read_own_profile                 | SELECT      | Authenticated             | auth.uid() = id                                      |
| profiles           | users_update_own_profile               | UPDATE      | Authenticated             | auth.uid() = id, cannot change role                  |
| profiles           | owners_read_tenant_profiles            | SELECT      | Owner                     | Tenant belongs to owner's property                   |
| subscription_plans | authenticated_read_active_plans        | SELECT      | Authenticated             | is_active = true                                     |
| subscription_plans | admin_full_access_plans                | ALL         | Admin                     | is_admin()                                           |
| user_subscriptions | users_read_own_subscription            | SELECT      | Authenticated             | auth.uid() = user_id                                 |
| user_subscriptions | admin_full_access_subscriptions        | ALL         | Admin                     | is_admin()                                           |
| properties         | admin_full_access_properties           | ALL         | Admin                     | is_admin()                                           |
| properties         | owners_manage_own_properties           | ALL         | Owner                     | auth.uid() = owner_id                                |
| properties         | tenants_read_own_properties            | SELECT      | Tenant                    | is_property_tenant(id) AND deleted_at IS NULL        |
| property_tenants   | admin_full_access_property_tenants     | ALL         | Admin                     | is_admin()                                           |
| property_tenants   | owners_manage_property_tenants         | ALL         | Owner                     | is_property_owner(property_id)                       |
| property_tenants   | tenants_read_own_records               | SELECT      | Tenant                    | tenant_id = auth.uid() OR is_property_tenant()       |
| property_tenants   | claim_invite_by_token                  | SELECT      | Public                    | invite_token IS NOT NULL AND status = 'invited'      |
| billing_cycles     | admin_full_access_cycles               | ALL         | Admin                     | is_admin()                                           |
| billing_cycles     | owners_manage_cycles                   | ALL         | Owner                     | is_property_owner(property_id)                       |
| billing_cycles     | tenants_read_cycles                    | SELECT      | Tenant                    | is_property_tenant(property_id)                      |
| bills              | admin_full_access_bills                | ALL         | Admin                     | is_admin()                                           |
| bills              | owners_manage_bills                    | ALL         | Owner                     | is_property_owner(property_id)                       |
| bills              | tenants_read_bills                     | SELECT      | Tenant                    | is_property_tenant(property_id)                      |
| bill_splits        | admin_full_access_splits               | ALL         | Admin                     | is_admin()                                           |
| bill_splits        | owners_manage_splits                   | ALL         | Owner                     | is_property_owner(property_id)                       |
| bill_splits        | tenants_read_splits                    | SELECT      | Tenant                    | is_property_tenant(property_id)                      |
| bill_flags         | admin_full_access_flags                | ALL         | Admin                     | is_admin()                                           |
| bill_flags         | owners_manage_flags                    | ALL         | Owner                     | is_property_owner(property_id)                       |
| bill_flags         | tenants_create_flags                   | INSERT      | Tenant                    | auth.uid() = flagged_by AND is_property_tenant()     |
| bill_flags         | tenants_read_own_flags                 | SELECT      | Tenant/Owner              | flagged_by = auth.uid() OR is_property_owner()       |
| notifications      | admin_full_access_notifications        | ALL         | Admin                     | is_admin()                                           |
| notifications      | users_read_own_notifications           | SELECT      | Authenticated             | auth.uid() = user_id                                 |
| notifications      | users_update_own_notifications         | UPDATE      | Authenticated             | auth.uid() = user_id                                 |
| audit_log          | admin_read_audit_log                   | SELECT      | Admin                     | is_admin()                                           |

---

## Seed Data Migration

The seed migration (`20250101000013_seed_575_mckinney.sql`) inserts the 575 McKinney property
data. This migration uses fixed UUIDs so that bill_splits can reference known IDs.

```sql
-- Fixed UUIDs for seed data
-- Owner: Shekar
-- Tenants: Anil, Navya, Vineesh, Val, Divya
-- Property: 575 McKinney
-- 2 Cycles, 6 Bills, 30 Bill Splits

-- See context/seed-data/575-mckinney-property-data.md for all values.
-- Bills use amount_cents: 9549, 27600, 13293, 9549, 22000, 11359
-- All split amount_cents values are pre-calculated using the person-days algorithm.
```

Refer to `context/seed-data/575-mckinney-property-data.md` for the complete JSON payloads
that populate this migration. The seed file should be idempotent using `INSERT ... ON CONFLICT DO NOTHING`.

---

## Design Decisions

1. **UUIDs everywhere**: All primary keys use `gen_random_uuid()` for globally unique,
   non-sequential identifiers suitable for a multi-tenant system.

2. **Denormalized property_id**: Tables like `bills`, `bill_splits`, and `bill_flags` carry
   a `property_id` column even though the property can be derived through joins. This enables
   efficient RLS policies that avoid expensive joins on every row access check.

3. **Amounts in cents**: All monetary values (`amount_cents`, `price_cents`,
   `suggested_amount_cents`) are stored as integers to avoid floating-point precision issues.
   Conversion to dollars happens only in the presentation layer.

4. **Soft deletes on properties**: Properties use `deleted_at` rather than hard deletes to
   preserve historical billing data for departed tenants.

5. **Service role for audit_log**: The audit_log table has no INSERT policy for regular users.
   All writes go through the Supabase service role client in server actions, ensuring
   tamper-proof logging.

6. **Realtime on notifications only**: Only the `notifications` table has Supabase Realtime
   enabled, minimizing resource consumption while providing live notification updates.
