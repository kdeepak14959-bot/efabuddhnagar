GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_assigned_teacher(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.owns_student(uuid) TO authenticated;