CREATE TYPE public.app_role AS ENUM ('admin', 'teacher', 'parent');
CREATE TYPE public.attendance_status AS ENUM ('present', 'absent', 'late');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  grade TEXT NOT NULL,
  teacher_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.classes TO authenticated;
GRANT ALL ON public.classes TO service_role;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  admission_number TEXT NOT NULL UNIQUE,
  date_of_birth DATE,
  class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.students TO authenticated;
GRANT ALL ON public.students TO service_role;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.parent_students (
  parent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (parent_id, student_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.parent_students TO authenticated;
GRANT ALL ON public.parent_students TO service_role;
ALTER TABLE public.parent_students ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  attendance_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status public.attendance_status NOT NULL DEFAULT 'present',
  marked_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(student_id, attendance_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance_records TO authenticated;
GRANT ALL ON public.attendance_records TO service_role;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notices TO authenticated;
GRANT ALL ON public.notices TO service_role;
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.timetable_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  weekday SMALLINT NOT NULL CHECK (weekday BETWEEN 1 AND 5),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  subject TEXT NOT NULL,
  room TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.timetable_entries TO authenticated;
GRANT ALL ON public.timetable_entries TO service_role;
ALTER TABLE public.timetable_entries ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin');
$$;

CREATE OR REPLACE FUNCTION public.is_assigned_teacher(class_uuid UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.classes WHERE id = class_uuid AND teacher_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.owns_student(student_uuid UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.parent_students WHERE parent_id = auth.uid() AND student_id = student_uuid);
$$;

CREATE POLICY "Profiles can be viewed by signed-in users" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "People can update their own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "Signed-in users can view permitted classes" ON public.classes FOR SELECT TO authenticated USING (public.is_admin() OR teacher_id = auth.uid() OR EXISTS (SELECT 1 FROM public.students s JOIN public.parent_students ps ON ps.student_id = s.id WHERE s.class_id = classes.id AND ps.parent_id = auth.uid()));
CREATE POLICY "Admins manage classes" ON public.classes FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Users view permitted students" ON public.students FOR SELECT TO authenticated USING (public.is_admin() OR public.is_assigned_teacher(class_id) OR public.owns_student(id));
CREATE POLICY "Admins manage students" ON public.students FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Parents view their child links" ON public.parent_students FOR SELECT TO authenticated USING (parent_id = auth.uid() OR public.is_admin());
CREATE POLICY "Admins manage parent child links" ON public.parent_students FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Users view permitted attendance" ON public.attendance_records FOR SELECT TO authenticated USING (public.is_admin() OR public.owns_student(student_id) OR EXISTS (SELECT 1 FROM public.students s WHERE s.id = attendance_records.student_id AND public.is_assigned_teacher(s.class_id)));
CREATE POLICY "Admins or class teachers record attendance" ON public.attendance_records FOR INSERT TO authenticated WITH CHECK (public.is_admin() OR EXISTS (SELECT 1 FROM public.students s WHERE s.id = attendance_records.student_id AND public.is_assigned_teacher(s.class_id)));
CREATE POLICY "Admins or class teachers update attendance" ON public.attendance_records FOR UPDATE TO authenticated USING (public.is_admin() OR EXISTS (SELECT 1 FROM public.students s WHERE s.id = attendance_records.student_id AND public.is_assigned_teacher(s.class_id))) WITH CHECK (public.is_admin() OR EXISTS (SELECT 1 FROM public.students s WHERE s.id = attendance_records.student_id AND public.is_assigned_teacher(s.class_id)));
CREATE POLICY "Admins manage attendance records" ON public.attendance_records FOR DELETE TO authenticated USING (public.is_admin());

CREATE POLICY "All signed-in users view notices" ON public.notices FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage notices" ON public.notices FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Users view permitted timetables" ON public.timetable_entries FOR SELECT TO authenticated USING (public.is_admin() OR public.is_assigned_teacher(class_id) OR EXISTS (SELECT 1 FROM public.students s JOIN public.parent_students ps ON ps.student_id = s.id WHERE s.class_id = timetable_entries.class_id AND ps.parent_id = auth.uid()));
CREATE POLICY "Admins manage timetables" ON public.timetable_entries FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_classes_updated_at BEFORE UPDATE ON public.classes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_students_updated_at BEFORE UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_attendance_updated_at BEFORE UPDATE ON public.attendance_records FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_notices_updated_at BEFORE UPDATE ON public.notices FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_timetable_updated_at BEFORE UPDATE ON public.timetable_entries FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();