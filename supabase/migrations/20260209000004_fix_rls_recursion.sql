-- Fix: Infinite recursion in RLS policies
-- The admin policies on profiles query profiles itself, causing recursion.
-- Solution: Create a SECURITY DEFINER function to check admin role
-- without going through RLS, then update all policies that used the
-- self-referencing pattern.

-- =============================================================================
-- 1. Create a helper function that bypasses RLS to check if user is admin
-- =============================================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- =============================================================================
-- 2. Fix profiles table policies (the root cause of recursion)
-- =============================================================================
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE
  USING (public.is_admin());

-- =============================================================================
-- 3. Fix properties table policies
-- =============================================================================
DROP POLICY IF EXISTS "Admins can manage all properties" ON public.properties;
CREATE POLICY "Admins can manage all properties"
  ON public.properties FOR ALL
  USING (public.is_admin());

-- =============================================================================
-- 4. Fix property_tenants table policies
-- =============================================================================
DROP POLICY IF EXISTS "Admins can manage all property tenants" ON public.property_tenants;
CREATE POLICY "Admins can manage all property tenants"
  ON public.property_tenants FOR ALL
  USING (public.is_admin());

-- =============================================================================
-- 5. Fix subscription_plans table policies
-- =============================================================================
DROP POLICY IF EXISTS "Admins can manage plans" ON public.subscription_plans;
CREATE POLICY "Admins can manage plans"
  ON public.subscription_plans FOR ALL
  USING (public.is_admin());

-- =============================================================================
-- 6. Fix user_subscriptions table policies
-- =============================================================================
DROP POLICY IF EXISTS "Admins can manage subscriptions" ON public.user_subscriptions;
CREATE POLICY "Admins can manage subscriptions"
  ON public.user_subscriptions FOR ALL
  USING (public.is_admin());

-- =============================================================================
-- 7. Fix billing_cycles table policies
-- =============================================================================
DROP POLICY IF EXISTS "Admins can manage all cycles" ON public.billing_cycles;
CREATE POLICY "Admins can manage all cycles"
  ON public.billing_cycles FOR ALL
  USING (public.is_admin());

-- =============================================================================
-- 8. Fix bills table policies
-- =============================================================================
DROP POLICY IF EXISTS "Admins can manage all bills" ON public.bills;
CREATE POLICY "Admins can manage all bills"
  ON public.bills FOR ALL
  USING (public.is_admin());

-- =============================================================================
-- 9. Fix bill_splits table policies
-- =============================================================================
DROP POLICY IF EXISTS "Admins can manage all splits" ON public.bill_splits;
CREATE POLICY "Admins can manage all splits"
  ON public.bill_splits FOR ALL
  USING (public.is_admin());

-- =============================================================================
-- 10. Fix bill_flags table policies
-- =============================================================================
DROP POLICY IF EXISTS "Admins can manage all flags" ON public.bill_flags;
CREATE POLICY "Admins can manage all flags"
  ON public.bill_flags FOR ALL
  USING (public.is_admin());

-- =============================================================================
-- 11. Fix notifications table policies
-- =============================================================================
DROP POLICY IF EXISTS "Admins can manage all notifications" ON public.notifications;
CREATE POLICY "Admins can manage all notifications"
  ON public.notifications FOR ALL
  USING (public.is_admin());

-- =============================================================================
-- 12. Fix audit_log table policies
-- =============================================================================
DROP POLICY IF EXISTS "Admins can view audit log" ON public.audit_log;
CREATE POLICY "Admins can view audit log"
  ON public.audit_log FOR SELECT
  USING (public.is_admin());
