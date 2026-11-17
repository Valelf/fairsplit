-- Fix: Cross-table RLS recursion between properties and property_tenants
--
-- Problem: "Tenants can view their properties" on properties queries property_tenants,
-- and "Owners can view property tenants" on property_tenants queries properties.
-- Postgres evaluates ALL SELECT policies (OR'd), so this creates a circular dependency.
--
-- Solution: Create SECURITY DEFINER helper functions that bypass RLS for
-- cross-table ownership/tenancy checks, then update the affected policies.

-- =============================================================================
-- 1. Helper: Check if current user owns a given property (bypasses RLS)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.is_property_owner(p_property_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.properties
    WHERE id = p_property_id AND owner_id = auth.uid()
  );
$$;

-- =============================================================================
-- 2. Helper: Check if current user is a tenant of a given property (bypasses RLS)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.is_property_tenant(p_property_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.property_tenants
    WHERE property_id = p_property_id
      AND tenant_id = auth.uid()
      AND status IN ('active', 'departed')
  );
$$;

-- =============================================================================
-- 3. Fix properties: tenant viewing policy (was querying property_tenants via RLS)
-- =============================================================================
DROP POLICY IF EXISTS "Tenants can view their properties" ON public.properties;
CREATE POLICY "Tenants can view their properties"
  ON public.properties FOR SELECT
  USING (
    deleted_at IS NULL
    AND public.is_property_tenant(id)
  );

-- =============================================================================
-- 4. Fix property_tenants: owner policies (were querying properties via RLS)
-- =============================================================================
DROP POLICY IF EXISTS "Owners can view property tenants" ON public.property_tenants;
CREATE POLICY "Owners can view property tenants"
  ON public.property_tenants FOR SELECT
  USING (public.is_property_owner(property_id));

DROP POLICY IF EXISTS "Owners can create property tenants" ON public.property_tenants;
CREATE POLICY "Owners can create property tenants"
  ON public.property_tenants FOR INSERT
  WITH CHECK (public.is_property_owner(property_id));

DROP POLICY IF EXISTS "Owners can update property tenants" ON public.property_tenants;
CREATE POLICY "Owners can update property tenants"
  ON public.property_tenants FOR UPDATE
  USING (public.is_property_owner(property_id));

-- =============================================================================
-- 5. Fix property_tenants: co-tenant viewing (was querying properties via RLS)
-- =============================================================================
DROP POLICY IF EXISTS "Tenants can view co-tenants in full transparency" ON public.property_tenants;
CREATE POLICY "Tenants can view co-tenants in full transparency"
  ON public.property_tenants FOR SELECT
  USING (
    public.is_property_tenant(property_id)
    AND EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_tenants.property_id
        AND p.transparency_level = 'full'
    )
  );
-- Note: The inner EXISTS on properties is safe because the properties SELECT
-- policies no longer reference property_tenants (we broke the cycle above).

-- =============================================================================
-- 6. Fix billing_cycles: owner & tenant policies (query properties/property_tenants)
-- =============================================================================
DROP POLICY IF EXISTS "Owners can manage cycles for own properties" ON public.billing_cycles;
CREATE POLICY "Owners can manage cycles for own properties"
  ON public.billing_cycles FOR ALL
  USING (public.is_property_owner(property_id));

DROP POLICY IF EXISTS "Tenants can view cycles for their properties" ON public.billing_cycles;
CREATE POLICY "Tenants can view cycles for their properties"
  ON public.billing_cycles FOR SELECT
  USING (public.is_property_tenant(property_id));

-- =============================================================================
-- 7. Fix bills: owner & tenant policies
-- =============================================================================
DROP POLICY IF EXISTS "Owners can manage bills for own properties" ON public.bills;
CREATE POLICY "Owners can manage bills for own properties"
  ON public.bills FOR ALL
  USING (public.is_property_owner(property_id));

DROP POLICY IF EXISTS "Tenants can view bills for their properties" ON public.bills;
CREATE POLICY "Tenants can view bills for their properties"
  ON public.bills FOR SELECT
  USING (public.is_property_tenant(property_id));

-- =============================================================================
-- 8. Fix bill_splits: owner & tenant policies
-- =============================================================================
DROP POLICY IF EXISTS "Owners can manage splits for own properties" ON public.bill_splits;
CREATE POLICY "Owners can manage splits for own properties"
  ON public.bill_splits FOR ALL
  USING (public.is_property_owner(property_id));

DROP POLICY IF EXISTS "Tenants can view all splits in full transparency" ON public.bill_splits;
CREATE POLICY "Tenants can view all splits in full transparency"
  ON public.bill_splits FOR SELECT
  USING (
    public.is_property_tenant(property_id)
    AND EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = bill_splits.property_id
        AND p.transparency_level = 'full'
    )
  );

-- "Tenants can view own splits" is safe — it only references property_tenants
-- by tenant_id (no cross-reference to properties), so no cycle.

-- =============================================================================
-- 9. Fix bill_flags: owner policy
-- =============================================================================
DROP POLICY IF EXISTS "Owners can manage flags for own properties" ON public.bill_flags;
CREATE POLICY "Owners can manage flags for own properties"
  ON public.bill_flags FOR ALL
  USING (public.is_property_owner(property_id));
