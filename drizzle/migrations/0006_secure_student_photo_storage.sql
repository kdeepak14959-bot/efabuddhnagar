CREATE POLICY "Administrators manage student photos"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'student-photos' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'student-photos' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "People view permitted student photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'student-photos'
  AND EXISTS (
    SELECT 1
    FROM public.students s
    WHERE s.photo_path = name
      AND (
        public.has_role(auth.uid(), 'admin')
        OR public.is_assigned_teacher(s.class_id)
        OR public.owns_student(s.id)
      )
  )
);