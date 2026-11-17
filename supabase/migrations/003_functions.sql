-- Helper function: Get user role
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = user_id;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function: Check if user is property owner
CREATE OR REPLACE FUNCTION public.is_property_owner(p_property_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.properties
    WHERE id = p_property_id AND owner_id = p_user_id AND deleted_at IS NULL
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function: Check if user is property tenant
CREATE OR REPLACE FUNCTION public.is_property_tenant(p_property_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.property_tenants
    WHERE property_id = p_property_id
      AND tenant_id = p_user_id
      AND status IN ('active', 'departed')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function: Get property transparency level
CREATE OR REPLACE FUNCTION public.get_property_transparency(p_property_id UUID)
RETURNS TEXT AS $$
  SELECT transparency_level FROM public.properties WHERE id = p_property_id;
$$ LANGUAGE sql SECURITY DEFINER STABLE;
