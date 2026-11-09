CREATE TABLE public.school_vacations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vacation_date date NOT NULL UNIQUE,
  title text NOT NULL,
  reason text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.school_vacations TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.school_vacations TO authenticated;
GRANT ALL ON public.school_vacations TO service_role;

ALTER TABLE public.school_vacations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed-in users view school vacations"
ON public.school_vacations
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Administrators manage school vacations"
ON public.school_vacations
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER set_school_vacations_updated_at
BEFORE UPDATE ON public.school_vacations
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX school_vacations_vacation_date_idx ON public.school_vacations (vacation_date);

CREATE OR REPLACE FUNCTION public.is_school_non_working_day(check_date date)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXTRACT(DOW FROM check_date) = 0
    OR EXISTS (
      SELECT 1 FROM public.school_vacations WHERE vacation_date = check_date
    );
$$;

GRANT EXECUTE ON FUNCTION public.is_school_non_working_day(date) TO authenticated;