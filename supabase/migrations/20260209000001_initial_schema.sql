-- FairSplit Initial Schema Migration
-- Creates all 11 tables with RLS policies

-- ============================================================
-- 1. PROFILES (extends auth.users)
-- ============================================================
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

CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_email ON public.profiles(email);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read their own profile; admins can read all
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Service role can insert profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (true);

-- ============================================================
-- 2. SUBSCRIPTION_PLANS (monetization scaffold)
-- ============================================================
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

CREATE POLICY "Anyone can view active plans"
  ON public.subscription_plans FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage plans"
  ON public.subscription_plans FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- 3. USER_SUBSCRIPTIONS
-- ============================================================
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

CREATE INDEX idx_user_subscriptions_user ON public.user_subscriptions(user_id);

ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription"
  ON public.user_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage subscriptions"
  ON public.user_subscriptions FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- 4. PROPERTIES
-- ============================================================
CREATE TABLE public.properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id),
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

CREATE INDEX idx_properties_owner ON public.properties(owner_id);

ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- Owners can manage their own properties
CREATE POLICY "Owners can view own properties"
  ON public.properties FOR SELECT
  USING (owner_id = auth.uid() AND deleted_at IS NULL);

CREATE POLICY "Owners can create properties"
  ON public.properties FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can update own properties"
  ON public.properties FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- NOTE: "Tenants can view their properties" policy moved below property_tenants table creation

-- Admins can do everything
CREATE POLICY "Admins can manage all properties"
  ON public.properties FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- 5. PROPERTY_TENANTS (join table)
-- ============================================================
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

CREATE INDEX idx_property_tenants_property ON public.property_tenants(property_id);
CREATE INDEX idx_property_tenants_tenant ON public.property_tenants(tenant_id);
CREATE INDEX idx_property_tenants_invite_token ON public.property_tenants(invite_token);

ALTER TABLE public.property_tenants ENABLE ROW LEVEL SECURITY;

-- Owners can manage tenants for their properties
CREATE POLICY "Owners can view property tenants"
  ON public.property_tenants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.properties
      WHERE id = property_tenants.property_id AND owner_id = auth.uid()
    )
  );

CREATE POLICY "Owners can create property tenants"
  ON public.property_tenants FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.properties
      WHERE id = property_tenants.property_id AND owner_id = auth.uid()
    )
  );

CREATE POLICY "Owners can update property tenants"
  ON public.property_tenants FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.properties
      WHERE id = property_tenants.property_id AND owner_id = auth.uid()
    )
  );

-- Tenants can view their own property_tenant records
CREATE POLICY "Tenants can view own records"
  ON public.property_tenants FOR SELECT
  USING (tenant_id = auth.uid());

-- Tenants can view co-tenants in full transparency properties
CREATE POLICY "Tenants can view co-tenants in full transparency"
  ON public.property_tenants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      JOIN public.property_tenants pt ON pt.property_id = p.id
      WHERE p.id = property_tenants.property_id
        AND pt.tenant_id = auth.uid()
        AND p.transparency_level = 'full'
    )
  );

-- Admins can manage all
CREATE POLICY "Admins can manage all property tenants"
  ON public.property_tenants FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Deferred policy: Tenants can view properties they belong to
-- (moved here because it references property_tenants which must exist first)
CREATE POLICY "Tenants can view their properties"
  ON public.properties FOR SELECT
  USING (
    deleted_at IS NULL AND
    EXISTS (
      SELECT 1 FROM public.property_tenants
      WHERE property_id = properties.id
        AND tenant_id = auth.uid()
        AND status IN ('active', 'departed')
    )
  );

-- ============================================================
-- 6. BILLING_CYCLES
-- ============================================================
CREATE TABLE public.billing_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'open', 'closed')) DEFAULT 'draft',
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_billing_cycles_property ON public.billing_cycles(property_id);

ALTER TABLE public.billing_cycles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage cycles for own properties"
  ON public.billing_cycles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.properties
      WHERE id = billing_cycles.property_id AND owner_id = auth.uid()
    )
  );

CREATE POLICY "Tenants can view cycles for their properties"
  ON public.billing_cycles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.property_tenants
      WHERE property_id = billing_cycles.property_id
        AND tenant_id = auth.uid()
        AND status IN ('active', 'departed')
    )
  );

CREATE POLICY "Admins can manage all cycles"
  ON public.billing_cycles FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- 7. BILLS
-- ============================================================
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
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_bills_cycle ON public.bills(cycle_id);
CREATE INDEX idx_bills_property ON public.bills(property_id);

ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage bills for own properties"
  ON public.bills FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.properties
      WHERE id = bills.property_id AND owner_id = auth.uid()
    )
  );

CREATE POLICY "Tenants can view bills for their properties"
  ON public.bills FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.property_tenants
      WHERE property_id = bills.property_id
        AND tenant_id = auth.uid()
        AND status IN ('active', 'departed')
    )
  );

CREATE POLICY "Admins can manage all bills"
  ON public.bills FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- 8. BILL_SPLITS (pre-calculated)
-- ============================================================
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
  UNIQUE(bill_id, tenant_id)
);

CREATE INDEX idx_bill_splits_bill ON public.bill_splits(bill_id);
CREATE INDEX idx_bill_splits_property ON public.bill_splits(property_id);
CREATE INDEX idx_bill_splits_tenant ON public.bill_splits(tenant_id);

ALTER TABLE public.bill_splits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage splits for own properties"
  ON public.bill_splits FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.properties
      WHERE id = bill_splits.property_id AND owner_id = auth.uid()
    )
  );

-- Tenants can view splits in full transparency properties
CREATE POLICY "Tenants can view all splits in full transparency"
  ON public.bill_splits FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      JOIN public.property_tenants pt ON pt.property_id = p.id
      WHERE p.id = bill_splits.property_id
        AND pt.tenant_id = auth.uid()
        AND p.transparency_level = 'full'
    )
  );

-- Tenants can view own splits in own_share transparency
CREATE POLICY "Tenants can view own splits"
  ON public.bill_splits FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.property_tenants
      WHERE id = bill_splits.tenant_id
        AND tenant_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all splits"
  ON public.bill_splits FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- 9. BILL_FLAGS
-- ============================================================
CREATE TABLE public.bill_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID NOT NULL REFERENCES public.bills(id),
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

CREATE INDEX idx_bill_flags_bill ON public.bill_flags(bill_id);
CREATE INDEX idx_bill_flags_property ON public.bill_flags(property_id);

ALTER TABLE public.bill_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants can create flags"
  ON public.bill_flags FOR INSERT
  WITH CHECK (flagged_by = auth.uid());

CREATE POLICY "Tenants can view own flags"
  ON public.bill_flags FOR SELECT
  USING (flagged_by = auth.uid());

CREATE POLICY "Owners can manage flags for own properties"
  ON public.bill_flags FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.properties
      WHERE id = bill_flags.property_id AND owner_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all flags"
  ON public.bill_flags FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- 10. NOTIFICATIONS
-- ============================================================
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

CREATE INDEX idx_notifications_user ON public.notifications(user_id);
CREATE INDEX idx_notifications_unread ON public.notifications(user_id, is_read) WHERE is_read = false;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Service role can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can manage all notifications"
  ON public.notifications FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- 11. AUDIT_LOG
-- ============================================================
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

CREATE INDEX idx_audit_log_user ON public.audit_log(user_id);
CREATE INDEX idx_audit_log_table ON public.audit_log(table_name);
CREATE INDEX idx_audit_log_created ON public.audit_log(created_at);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit log"
  ON public.audit_log FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Service role can insert audit log"
  ON public.audit_log FOR INSERT
  WITH CHECK (true);

-- ============================================================
-- TRIGGER: Auto-update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.property_tenants
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.billing_cycles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.bills
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.bill_splits
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.bill_flags
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- TRIGGER: Auto-create profile on auth.users insert
-- ============================================================
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
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- FUNCTION: Enable Realtime for notifications
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
