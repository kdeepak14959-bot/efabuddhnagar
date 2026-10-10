-- New helper functions to break recursion
CREATE OR REPLACE FUNCTION public.is_parent_of_student_in_class(class_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.students s
    JOIN public.parent_students ps ON ps.student_id = s.id
    WHERE s.class_id = class_uuid AND ps.parent_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_teacher_of_student(student_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.students s
    JOIN public.classes c ON c.id = s.class_id
    WHERE s.id = student_uuid AND c.teacher_id = auth.uid()
  );
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.is_parent_of_student_in_class(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_teacher_of_student(uuid) TO authenticated;

-- Update classes SELECT policy
DROP POLICY IF EXISTS "Signed-in users can view permitted classes" ON public.classes;
CREATE POLICY "Signed-in users can view permitted classes" ON public.classes
FOR SELECT TO authenticated
USING (
  public.is_admin() 
  OR teacher_id = auth.uid() 
  OR public.is_parent_of_student_in_class(id)
);

-- Update students SELECT policy
DROP POLICY IF EXISTS "Users view permitted students" ON public.students;
CREATE POLICY "Users view permitted students" ON public.students
FOR SELECT TO authenticated
USING (
  public.is_admin()
  OR public.is_assigned_teacher(class_id)
  OR public.owns_student(id)
);

-- Update timetable_entries SELECT policy
DROP POLICY IF EXISTS "Users view permitted timetables" ON public.timetable_entries;
CREATE POLICY "Users view permitted timetables" ON public.timetable_entries
FOR SELECT TO authenticated
USING (
  public.is_admin()
  OR public.is_assigned_teacher(class_id)
  OR public.is_parent_of_student_in_class(class_id)
);

-- Update attendance_records policies
DROP POLICY IF EXISTS "Users view permitted attendance" ON public.attendance_records;
CREATE POLICY "Users view permitted attendance" ON public.attendance_records
FOR SELECT TO authenticated
USING (
  public.is_admin()
  OR public.owns_student(student_id)
  OR public.is_teacher_of_student(student_id)
);

DROP POLICY IF EXISTS "Admins or class teachers record attendance" ON public.attendance_records;
CREATE POLICY "Admins or class teachers record attendance" ON public.attendance_records
FOR INSERT TO authenticated
WITH CHECK (
  public.is_admin() 
  OR public.is_teacher_of_student(student_id)
);

DROP POLICY IF EXISTS "Admins or class teachers update attendance" ON public.attendance_records;
CREATE POLICY "Admins or class teachers update attendance" ON public.attendance_records
FOR UPDATE TO authenticated
USING (
  public.is_admin() 
  OR public.is_teacher_of_student(student_id)
)
WITH CHECK (
  public.is_admin() 
  OR public.is_teacher_of_student(student_id)
);
