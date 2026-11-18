-- Storage bucket for uploaded bill PDFs + scheduled jobs (2026-11-18)

-- ============================================================
-- Storage: private bucket, objects keyed "<property_id>/<file>"
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('bill-pdfs', 'bill-pdfs', false, 10485760, ARRAY['application/pdf', 'image/png', 'image/jpeg'])
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.try_uuid(p_text TEXT)
RETURNS UUID
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN p_text::uuid;
EXCEPTION WHEN others THEN
  RETURN NULL;
END;
$$;

DROP POLICY IF EXISTS "Owners manage bill files" ON storage.objects;
CREATE POLICY "Owners manage bill files"
  ON storage.objects FOR ALL
  TO authenticated
  USING (
    bucket_id = 'bill-pdfs'
    AND public.is_property_owner(public.try_uuid((storage.foldername(name))[1]))
  )
  WITH CHECK (
    bucket_id = 'bill-pdfs'
    AND public.is_property_owner(public.try_uuid((storage.foldername(name))[1]))
  );

DROP POLICY IF EXISTS "Tenants read bill files" ON storage.objects;
CREATE POLICY "Tenants read bill files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'bill-pdfs'
    AND public.is_property_tenant(public.try_uuid((storage.foldername(name))[1]))
  );

-- ============================================================
-- Heartbeat + scheduled jobs
-- ============================================================
CREATE TABLE IF NOT EXISTS public.app_heartbeat (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  last_cron_at TIMESTAMPTZ,
  last_ping_at TIMESTAMPTZ
);
INSERT INTO public.app_heartbeat (id) VALUES (1) ON CONFLICT DO NOTHING;
ALTER TABLE public.app_heartbeat ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view heartbeat" ON public.app_heartbeat FOR SELECT USING (public.is_admin());

-- Called by the external keep-alive (GitHub Actions) through the REST API.
-- Real API traffic is what keeps a free-tier project from pausing.
CREATE OR REPLACE FUNCTION public.ping()
RETURNS TIMESTAMPTZ
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.app_heartbeat SET last_ping_at = now() WHERE id = 1 RETURNING last_ping_at;
$$;
REVOKE ALL ON FUNCTION public.ping() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ping() TO anon, authenticated;

-- Nightly housekeeping. Overdue-payment checks land here in Phase 1.
CREATE OR REPLACE FUNCTION public.nightly_maintenance()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.app_heartbeat SET last_cron_at = now() WHERE id = 1;

  -- Read notifications older than 90 days are noise.
  DELETE FROM public.notifications
   WHERE is_read = true AND created_at < now() - interval '90 days';
END;
$$;
REVOKE ALL ON FUNCTION public.nightly_maintenance() FROM PUBLIC, anon, authenticated;

CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'fairsplit-nightly';
  PERFORM cron.schedule('fairsplit-nightly', '0 7 * * *', 'select public.nightly_maintenance()');
END;
$$;
