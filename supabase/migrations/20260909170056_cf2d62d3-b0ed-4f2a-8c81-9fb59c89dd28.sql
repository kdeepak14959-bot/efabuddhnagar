REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.is_assigned_teacher(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.owns_student(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO postgres, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin() TO postgres, service_role;
GRANT EXECUTE ON FUNCTION public.is_assigned_teacher(uuid) TO postgres, service_role;
GRANT EXECUTE ON FUNCTION public.owns_student(uuid) TO postgres, service_role;