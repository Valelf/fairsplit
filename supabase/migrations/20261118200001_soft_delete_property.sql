-- Owners could not soft-delete a property through RLS: the SELECT policy hides rows with
-- deleted_at set, so `UPDATE ... SET deleted_at = now()` fails with "new row violates row-level
-- security policy". This owner-checked RPC performs the soft delete instead. Idempotent.

CREATE OR REPLACE FUNCTION public.soft_delete_property(p_property_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.is_property_owner(p_property_id) OR public.is_admin()) THEN
    RAISE EXCEPTION 'Property not found or access denied' USING ERRCODE = '42501';
  END IF;
  UPDATE public.properties
     SET deleted_at = now(), updated_at = now()
   WHERE id = p_property_id AND deleted_at IS NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.soft_delete_property(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.soft_delete_property(UUID) TO authenticated, service_role;
