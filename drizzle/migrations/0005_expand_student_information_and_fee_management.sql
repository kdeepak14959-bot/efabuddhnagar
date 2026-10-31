ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS gender TEXT,
  ADD COLUMN IF NOT EXISTS admission_date DATE,
  ADD COLUMN IF NOT EXISTS father_name TEXT,
  ADD COLUMN IF NOT EXISTS mother_name TEXT,
  ADD COLUMN IF NOT EXISTS guardian_name TEXT,
  ADD COLUMN IF NOT EXISTS primary_mobile TEXT,
  ADD COLUMN IF NOT EXISTS alternate_mobile TEXT,
  ADD COLUMN IF NOT EXISTS address_village TEXT,
  ADD COLUMN IF NOT EXISTS address_post_office TEXT,
  ADD COLUMN IF NOT EXISTS address_district TEXT,
  ADD COLUMN IF NOT EXISTS address_state TEXT,
  ADD COLUMN IF NOT EXISTS address_pin_code TEXT,
  ADD COLUMN IF NOT EXISTS guardian_email TEXT,
  ADD COLUMN IF NOT EXISTS photo_path TEXT,
  ADD COLUMN IF NOT EXISTS previous_school_name TEXT,
  ADD COLUMN IF NOT EXISTS emergency_contact_number TEXT,
  ADD COLUMN IF NOT EXISTS enrollment_status TEXT NOT NULL DEFAULT 'active';

ALTER TABLE public.students
  ADD CONSTRAINT students_gender_valid CHECK (gender IS NULL OR gender IN ('female', 'male', 'other', 'prefer_not_to_say')),
  ADD CONSTRAINT students_enrollment_status_valid CHECK (enrollment_status IN ('active', 'inactive', 'transferred'));

CREATE TABLE public.fee_structures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  academic_session TEXT NOT NULL,
  admission_fee NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (admission_fee >= 0),
  tuition_fee_monthly NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (tuition_fee_monthly >= 0),
  examination_fee NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (examination_fee >= 0),
  transport_fee_monthly NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (transport_fee_monthly >= 0),
  other_charges NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (other_charges >= 0),
  due_day SMALLINT NOT NULL DEFAULT 10 CHECK (due_day BETWEEN 1 AND 28),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(class_id, academic_session)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fee_structures TO authenticated;
GRANT ALL ON public.fee_structures TO service_role;
ALTER TABLE public.fee_structures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Administrators manage fee structures" ON public.fee_structures FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Families view their class fee structures" ON public.fee_structures FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.parent_students ps JOIN public.students s ON s.id = ps.student_id WHERE ps.parent_id = auth.uid() AND s.class_id = fee_structures.class_id));

CREATE TABLE public.student_fee_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  fee_structure_id UUID REFERENCES public.fee_structures(id) ON DELETE SET NULL,
  academic_session TEXT NOT NULL,
  due_date DATE NOT NULL,
  admission_fee NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (admission_fee >= 0),
  tuition_fee NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (tuition_fee >= 0),
  examination_fee NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (examination_fee >= 0),
  transport_fee NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (transport_fee >= 0),
  other_charges NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (other_charges >= 0),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_fee_records TO authenticated;
GRANT ALL ON public.student_fee_records TO service_role;
ALTER TABLE public.student_fee_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Administrators manage student fee records" ON public.student_fee_records FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Parents view their child fee records" ON public.student_fee_records FOR SELECT TO authenticated USING (public.owns_student(student_id));

CREATE TABLE public.fee_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fee_record_id UUID NOT NULL REFERENCES public.student_fee_records(id) ON DELETE CASCADE,
  receipt_number TEXT NOT NULL UNIQUE,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'upi', 'bank_transfer')),
  reference_number TEXT,
  recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fee_payments TO authenticated;
GRANT ALL ON public.fee_payments TO service_role;
ALTER TABLE public.fee_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Administrators manage fee payments" ON public.fee_payments FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Parents view their child fee payments" ON public.fee_payments FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.student_fee_records fr WHERE fr.id = fee_payments.fee_record_id AND public.owns_student(fr.student_id)));

CREATE INDEX students_profile_search_idx ON public.students (class_id, roll_number, full_name);
CREATE INDEX student_fee_records_student_idx ON public.student_fee_records (student_id, due_date);
CREATE INDEX fee_payments_fee_record_idx ON public.fee_payments (fee_record_id, payment_date);

CREATE TRIGGER set_fee_structures_updated_at BEFORE UPDATE ON public.fee_structures FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_student_fee_records_updated_at BEFORE UPDATE ON public.student_fee_records FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.enforce_fee_payment_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_due NUMERIC(12,2);
  total_paid NUMERIC(12,2);
BEGIN
  SELECT admission_fee + tuition_fee + examination_fee + transport_fee + other_charges
  INTO total_due
  FROM public.student_fee_records
  WHERE id = NEW.fee_record_id;

  IF total_due IS NULL THEN
    RAISE EXCEPTION 'Fee record not found';
  END IF;

  SELECT COALESCE(SUM(amount), 0)
  INTO total_paid
  FROM public.fee_payments
  WHERE fee_record_id = NEW.fee_record_id;

  IF total_paid + NEW.amount > total_due THEN
    RAISE EXCEPTION 'Payment exceeds the remaining balance';
  END IF;

  RETURN NEW;
END;
$$;
CREATE TRIGGER enforce_fee_payment_limit_before_insert BEFORE INSERT ON public.fee_payments FOR EACH ROW EXECUTE FUNCTION public.enforce_fee_payment_limit();

CREATE OR REPLACE FUNCTION public.create_fee_records_for_class(_class_id UUID, _academic_session TEXT, _due_date DATE)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  created_count INTEGER;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  INSERT INTO public.student_fee_records (student_id, fee_structure_id, academic_session, due_date, admission_fee, tuition_fee, examination_fee, transport_fee, other_charges)
  SELECT s.id, fs.id, _academic_session, _due_date, fs.admission_fee, fs.tuition_fee_monthly, fs.examination_fee, fs.transport_fee_monthly, fs.other_charges
  FROM public.students s
  JOIN public.fee_structures fs ON fs.class_id = s.class_id AND fs.academic_session = _academic_session
  WHERE s.class_id = _class_id
    AND s.enrollment_status = 'active'
    AND NOT EXISTS (
      SELECT 1 FROM public.student_fee_records existing
      WHERE existing.student_id = s.id
        AND existing.academic_session = _academic_session
        AND existing.due_date = _due_date
    );

  GET DIAGNOSTICS created_count = ROW_COUNT;
  RETURN created_count;
END;
$$;
GRANT EXECUTE ON FUNCTION public.create_fee_records_for_class(UUID, TEXT, DATE) TO authenticated;
