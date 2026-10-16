DROP POLICY IF EXISTS "Principals manage school settings" ON public.school_settings;

CREATE POLICY "Principals manage school settings"
ON public.school_settings
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Signed-in users view school settings"
ON public.school_settings
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Principals view school branding" ON storage.objects;

CREATE POLICY "Signed-in users view school branding"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'school-branding');

CREATE POLICY "Principals view school branding"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'school-branding' AND public.is_admin());