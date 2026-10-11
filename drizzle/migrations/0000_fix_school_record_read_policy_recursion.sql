DROP POLICY IF EXISTS "Admins manage attendance records" ON public.attendance_records;
DROP POLICY IF EXISTS "Admins or class teachers record attendance" ON public.attendance_records;
DROP POLICY IF EXISTS "Admins or class teachers update attendance" ON public.attendance_records;
DROP POLICY IF EXISTS "Users view permitted attendance" ON public.attendance_records;
DROP POLICY IF EXISTS "Admins manage classes" ON public.classes;
DROP POLICY IF EXISTS "Signed-in users can view permitted classes" ON public.classes;
DROP POLICY IF EXISTS "Admins manage parent child links" ON public.parent_students;
DROP POLICY IF EXISTS "Parents view their child links" ON public.parent_students;
DROP POLICY IF EXISTS "Admins manage students" ON public.students;
DROP POLICY IF EXISTS "Users view permitted students" ON public.students;
DROP POLICY IF EXISTS "Admins manage timetables" ON public.timetable_entries;
DROP POLICY IF EXISTS "Users view permitted timetables" ON public.timetable_entries;

CREATE POLICY "Administrators manage attendance records"
ON public.attendance_records
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers record attendance for their assigned classes"
ON public.attendance_records
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.students s
    WHERE s.id = attendance_records.student_id
      AND public.is_assigned_teacher(s.class_id)
  )
);

CREATE POLICY "Teachers update attendance for their assigned classes"
ON public.attendance_records
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.students s
    WHERE s.id = attendance_records.student_id
      AND public.is_assigned_teacher(s.class_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.students s
    WHERE s.id = attendance_records.student_id
      AND public.is_assigned_teacher(s.class_id)
  )
);

CREATE POLICY "People view permitted attendance"
ON public.attendance_records
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.owns_student(student_id)
  OR EXISTS (
    SELECT 1
    FROM public.students s
    WHERE s.id = attendance_records.student_id
      AND public.is_assigned_teacher(s.class_id)
  )
);

CREATE POLICY "Administrators manage classes"
ON public.classes
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers view their assigned classes"
ON public.classes
FOR SELECT
TO authenticated
USING (teacher_id = auth.uid());

CREATE POLICY "Parents view their children's classes"
ON public.classes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.parent_students ps
    JOIN public.students s ON s.id = ps.student_id
    WHERE ps.parent_id = auth.uid()
      AND s.class_id = classes.id
  )
);

CREATE POLICY "Administrators manage parent child links"
ON public.parent_students
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Parents view their own child links"
ON public.parent_students
FOR SELECT
TO authenticated
USING (parent_id = auth.uid());

CREATE POLICY "Administrators manage students"
ON public.students
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers view students in their assigned classes"
ON public.students
FOR SELECT
TO authenticated
USING (public.is_assigned_teacher(class_id));

CREATE POLICY "Parents view their own children"
ON public.students
FOR SELECT
TO authenticated
USING (public.owns_student(id));

CREATE POLICY "Administrators manage timetables"
ON public.timetable_entries
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers view timetables for their assigned classes"
ON public.timetable_entries
FOR SELECT
TO authenticated
USING (public.is_assigned_teacher(class_id));

CREATE POLICY "Parents view timetables for their own children"
ON public.timetable_entries
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.parent_students ps
    JOIN public.students s ON s.id = ps.student_id
    WHERE ps.parent_id = auth.uid()
      AND s.class_id = timetable_entries.class_id
  )
);

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_assigned_teacher(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.owns_student(uuid) TO authenticated;