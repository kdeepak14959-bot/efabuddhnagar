DROP POLICY IF EXISTS "Anyone views school branding" ON storage.objects;
CREATE POLICY "Principals view school branding" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'school-branding' AND public.is_admin());