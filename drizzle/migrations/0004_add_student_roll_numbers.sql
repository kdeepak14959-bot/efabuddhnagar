ALTER TABLE public.students ADD COLUMN roll_number INTEGER;
ALTER TABLE public.students ADD CONSTRAINT students_roll_number_positive CHECK (roll_number IS NULL OR roll_number > 0);
CREATE UNIQUE INDEX students_class_roll_number_unique ON public.students (class_id, roll_number) WHERE roll_number IS NOT NULL;