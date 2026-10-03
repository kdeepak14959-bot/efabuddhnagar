DROP POLICY IF EXISTS "Users view permitted students" ON public.students;
CREATE POLICY "Users view permitted students"
ON public.students
FOR SELECT
TO authenticated
USING (
  public.is_admin()
  OR EXISTS (
    SELECT 1
    FROM public.classes c
    WHERE c.id = students.class_id
      AND c.teacher_id = auth.uid()
  )
  OR public.owns_student(id)
);

DROP POLICY IF EXISTS "Users view permitted timetables" ON public.timetable_entries;
CREATE POLICY "Users view permitted timetables"
ON public.timetable_entries
FOR SELECT
TO authenticated
USING (
  public.is_admin()
  OR EXISTS (
    SELECT 1
    FROM public.classes c
    WHERE c.id = timetable_entries.class_id
      AND c.teacher_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.students s
    JOIN public.parent_students ps ON ps.student_id = s.id
    WHERE s.class_id = timetable_entries.class_id
      AND ps.parent_id = auth.uid()
  )
);