CREATE TABLE public.school_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_name text NOT NULL DEFAULT 'Riverstone Heights Academy',
  logo_url text,
  address text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  principal_name text NOT NULL DEFAULT '',
  affiliation_board text NOT NULL DEFAULT '',
  academic_session text NOT NULL DEFAULT '2026–2027',
  working_days text[] NOT NULL DEFAULT ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  opening_time time NOT NULL DEFAULT '08:00',
  closing_time time NOT NULL DEFAULT '15:30',
  theme_color text NOT NULL DEFAULT '#264653',
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.school_settings TO authenticated;
GRANT ALL ON public.school_settings TO service_role;
ALTER TABLE public.school_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Principals manage school settings" ON public.school_settings
FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());
CREATE TRIGGER set_school_settings_updated_at
BEFORE UPDATE ON public.school_settings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE POLICY "Principals upload school branding" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'school-branding' AND public.is_admin());
CREATE POLICY "Principals update school branding" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'school-branding' AND public.is_admin())
WITH CHECK (bucket_id = 'school-branding' AND public.is_admin());
CREATE POLICY "Principals delete school branding" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'school-branding' AND public.is_admin());
CREATE POLICY "Anyone views school branding" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'school-branding');