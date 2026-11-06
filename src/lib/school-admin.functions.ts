import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

const teacherInput = z.object({
  fullName: z.string().trim().min(2).max(100),
  email: z.string().trim().email(),
  temporaryPassword: z.string().min(8).max(128),
});

const teacherUpdateInput = z.object({
  id: z.string().uuid(),
  fullName: z.string().trim().min(2).max(100),
});

const teacherDeleteInput = z.object({
  id: z.string().uuid(),
});

const studentDeleteInput = z.object({
  id: z.string().uuid(),
});

const classDeleteInput = z.object({
  id: z.string().uuid(),
});

const principalPasswordResetInput = z.object({
  password: z.string().min(12).max(128),
});

const attendanceStatus = z.enum(["present", "late", "absent", "vacation"]);
const studentStatus = z.enum(["active", "inactive", "transferred"]);
const studentProfileInput = z.object({
  id: z.string().uuid().optional(),
  fullName: z.string().trim().min(2).max(120),
  admissionNumber: z.string().trim().min(2).max(60),
  rollNumber: z.number().int().positive().nullable(),
  classId: z.string().uuid().nullable(),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  gender: z.enum(["female", "male", "other", "prefer_not_to_say"]).nullable(),
  admissionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  fatherName: z.string().trim().max(120).nullable(),
  motherName: z.string().trim().max(120).nullable(),
  guardianName: z.string().trim().max(120).nullable(),
  primaryMobile: z.string().trim().max(32).nullable(),
  alternateMobile: z.string().trim().max(32).nullable(),
  addressVillage: z.string().trim().max(120).nullable(),
  addressPostOffice: z.string().trim().max(120).nullable(),
  addressDistrict: z.string().trim().max(120).nullable(),
  addressState: z.string().trim().max(120).nullable(),
  addressPinCode: z.string().trim().max(16).nullable(),
  guardianEmail: z.string().trim().email().max(255).nullable(),
  photoPath: z.string().trim().max(512).nullable(),
  previousSchoolName: z.string().trim().max(160).nullable(),
  emergencyContactNumber: z.string().trim().max(32).nullable(),
  enrollmentStatus: studentStatus,
});
const studentImportRowInput = studentProfileInput.omit({ id: true });
const studentImportInput = z.object({
  students: z.array(studentImportRowInput).min(1).max(500),
});
const feeStructureInput = z.object({
  classId: z.string().uuid(),
  academicSession: z.string().trim().min(4).max(40),
  admissionFee: z.number().min(0).max(10000000),
  tuitionFeeMonthly: z.number().min(0).max(10000000),
  examinationFee: z.number().min(0).max(10000000),
  transportFeeMonthly: z.number().min(0).max(10000000),
  otherCharges: z.number().min(0).max(10000000),
  dueDay: z.number().int().min(1).max(28),
});
const generateFeeRecordsInput = z.object({
  classId: z.string().uuid(),
  academicSession: z.string().trim().min(4).max(40),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
const feePaymentInput = z.object({
  feeRecordId: z.string().uuid(),
  amount: z.number().positive().max(10000000),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  paymentMethod: z.enum(["cash", "upi", "bank_transfer"]),
  referenceNumber: z.string().trim().max(120).nullable(),
});
const studentFeeSummaryInput = z.object({ id: z.string().uuid() });
const saveAttendanceInput = z.object({
  classId: z.string().uuid(),
  attendanceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  records: z
    .array(
      z.object({
        studentId: z.string().uuid(),
        status: attendanceStatus,
      }),
    )
    .min(1)
    .max(500),
});

const attendanceReportInput = z.object({
  classId: z.string().uuid().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

const attendanceSummaryInput = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export async function requirePrincipal(context: {
  supabase: SupabaseClient<Database>;
  userId: string;
}) {
  const { data: role, error } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .maybeSingle();

  if (error || role?.role !== "admin") throw new Response("Forbidden", { status: 403 });
}

export const createTeacherAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => teacherInput.parse(data))
  .handler(async ({ data, context }) => {
    await requirePrincipal(context);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.temporaryPassword,
      email_confirm: true,
    });

    if (createError || !created.user) {
      throw new Error(createError?.message ?? "Could not create the teacher account.");
    }

    const teacherId = created.user.id;
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert({ id: teacherId, full_name: data.fullName }, { onConflict: "id" });
    if (profileError) throw new Error(profileError.message);

    const { error: assignmentError } = await supabaseAdmin
      .from("user_roles")
      .update({ role: "teacher" })
      .eq("user_id", teacherId);
    if (assignmentError) throw new Error(assignmentError.message);

    return { id: teacherId, fullName: data.fullName };
  });

export const updateTeacherAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => teacherUpdateInput.parse(data))
  .handler(async ({ data, context }) => {
    await requirePrincipal(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ full_name: data.fullName })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteTeacherAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => teacherDeleteInput.parse(data))
  .handler(async ({ data, context }) => {
    await requirePrincipal(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: classError } = await supabaseAdmin
      .from("classes")
      .update({ teacher_id: null })
      .eq("teacher_id", data.id);
    if (classError) throw new Error(classError.message);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteStudentRecord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => studentDeleteInput.parse(data))
  .handler(async ({ data, context }) => {
    await requirePrincipal(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: attendanceError } = await supabaseAdmin
      .from("attendance_records")
      .delete()
      .eq("student_id", data.id);
    if (attendanceError) throw new Error(attendanceError.message);
    const { error: linkError } = await supabaseAdmin
      .from("parent_students")
      .delete()
      .eq("student_id", data.id);
    if (linkError) throw new Error(linkError.message);
    const { error } = await supabaseAdmin.from("students").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteClassRecord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => classDeleteInput.parse(data))
  .handler(async ({ data, context }) => {
    await requirePrincipal(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: timetableError } = await supabaseAdmin
      .from("timetable_entries")
      .delete()
      .eq("class_id", data.id);
    if (timetableError) throw new Error(timetableError.message);
    const { error: studentError } = await supabaseAdmin
      .from("students")
      .update({ class_id: null })
      .eq("class_id", data.id);
    if (studentError) throw new Error(studentError.message);
    const { error } = await supabaseAdmin.from("classes").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const resetPrincipalPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => principalPasswordResetInput.parse(data))
  .handler(async ({ data, context }) => {
    await requirePrincipal(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: principal, error: principalError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (principalError) throw new Error(principalError.message);
    const principalUser = principal.users.find(
      (user) => user.email?.toLowerCase() === "principal@school.com",
    );
    if (!principalUser) throw new Error("Principal account was not found.");

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(principalUser.id, {
      password: data.password,
      email_confirm: true,
    });
    if (updateError) throw new Error(updateError.message);
    return { ok: true };
  });

export const saveStudentProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => studentProfileInput.parse(data))
  .handler(async ({ data, context }) => {
    await requirePrincipal(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const payload = {
      full_name: data.fullName,
      admission_number: data.admissionNumber,
      roll_number: data.rollNumber,
      class_id: data.classId,
      date_of_birth: data.dateOfBirth,
      gender: data.gender,
      admission_date: data.admissionDate,
      father_name: data.fatherName,
      mother_name: data.motherName,
      guardian_name: data.guardianName,
      primary_mobile: data.primaryMobile,
      alternate_mobile: data.alternateMobile,
      address_village: data.addressVillage,
      address_post_office: data.addressPostOffice,
      address_district: data.addressDistrict,
      address_state: data.addressState,
      address_pin_code: data.addressPinCode,
      guardian_email: data.guardianEmail,
      photo_path: data.photoPath,
      previous_school_name: data.previousSchoolName,
      emergency_contact_number: data.emergencyContactNumber,
      enrollment_status: data.enrollmentStatus,
    };
    const result = data.id
      ? await supabaseAdmin.from("students").update(payload).eq("id", data.id).select("id").single()
      : await supabaseAdmin.from("students").insert(payload).select("id").single();
    if (result.error || !result.data) throw new Error(result.error?.message ?? "Could not save the student.");
    return { id: result.data.id };
  });

export const importStudentRecords = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => studentImportInput.parse(data))
  .handler(async ({ data, context }) => {
    await requirePrincipal(context);
    const admissionNumbers = data.students.map((student) => student.admissionNumber);
    const duplicateAdmissions = admissionNumbers.filter(
      (value, index) => admissionNumbers.indexOf(value) !== index,
    );
    if (duplicateAdmissions.length) {
      throw new Error(`Duplicate admission number in the file: ${duplicateAdmissions[0]}.`);
    }

    const classIds = [...new Set(data.students.flatMap((student) => student.classId ? [student.classId] : []))];
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (classIds.length) {
      const { data: foundClasses, error: classError } = await supabaseAdmin
        .from("classes")
        .select("id")
        .in("id", classIds);
      if (classError) throw new Error(classError.message);
      if ((foundClasses ?? []).length !== classIds.length) {
        throw new Error("One or more selected classes are no longer available.");
      }
    }

    const { data: existingStudents, error: existingError } = await supabaseAdmin
      .from("students")
      .select("admission_number")
      .in("admission_number", admissionNumbers);
    if (existingError) throw new Error(existingError.message);
    const existingAdmission = existingStudents?.[0]?.admission_number;
    if (existingAdmission) {
      throw new Error(`Admission number already exists: ${existingAdmission}. Existing records were not changed.`);
    }

    const payload = data.students.map((student) => ({
      full_name: student.fullName,
      admission_number: student.admissionNumber,
      roll_number: student.rollNumber,
      class_id: student.classId,
      date_of_birth: student.dateOfBirth,
      gender: student.gender,
      admission_date: student.admissionDate,
      father_name: student.fatherName,
      mother_name: student.motherName,
      guardian_name: student.guardianName,
      primary_mobile: student.primaryMobile,
      alternate_mobile: student.alternateMobile,
      address_village: student.addressVillage,
      address_post_office: student.addressPostOffice,
      address_district: student.addressDistrict,
      address_state: student.addressState,
      address_pin_code: student.addressPinCode,
      guardian_email: student.guardianEmail,
      photo_path: student.photoPath,
      previous_school_name: student.previousSchoolName,
      emergency_contact_number: student.emergencyContactNumber,
      enrollment_status: student.enrollmentStatus,
    }));
    const { error: insertError } = await supabaseAdmin.from("students").insert(payload);
    if (insertError) {
      if (insertError.code === "23505") throw new Error("A student with the same admission number or class roll number already exists. No records were imported.");
      throw new Error(insertError.message);
    }
    return { imported: payload.length };
  });

export const saveFeeStructure = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => feeStructureInput.parse(data))
  .handler(async ({ data, context }) => {
    await requirePrincipal(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("fee_structures").upsert({
      class_id: data.classId,
      academic_session: data.academicSession,
      admission_fee: data.admissionFee,
      tuition_fee_monthly: data.tuitionFeeMonthly,
      examination_fee: data.examinationFee,
      transport_fee_monthly: data.transportFeeMonthly,
      other_charges: data.otherCharges,
      due_day: data.dueDay,
    }, { onConflict: "class_id,academic_session" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const generateClassFeeRecords = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => generateFeeRecordsInput.parse(data))
  .handler(async ({ data, context }) => {
    await requirePrincipal(context);
    const { data: count, error } = await context.supabase.rpc("create_fee_records_for_class", {
      _class_id: data.classId,
      _academic_session: data.academicSession,
      _due_date: data.dueDate,
    });
    if (error) throw new Error(error.message);
    return { created: count ?? 0 };
  });

export const recordFeePayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => feePaymentInput.parse(data))
  .handler(async ({ data, context }) => {
    await requirePrincipal(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const receiptNumber = `RCP-${data.paymentDate.replaceAll("-", "")}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const { data: payment, error } = await supabaseAdmin.from("fee_payments").insert({
      fee_record_id: data.feeRecordId,
      receipt_number: receiptNumber,
      amount: data.amount,
      payment_date: data.paymentDate,
      payment_method: data.paymentMethod,
      reference_number: data.referenceNumber,
      recorded_by: context.userId,
    }).select("id,receipt_number").single();
    if (error || !payment) throw new Error(error?.message ?? "Could not record the payment.");
    return { id: payment.id, receiptNumber: payment.receipt_number };
  });

export const getStudentFeeSummary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => studentFeeSummaryInput.parse(data))
  .handler(async ({ data, context }) => {
    const { data: role, error: roleError } = await context.supabase.from("user_roles").select("role").eq("user_id", context.userId).maybeSingle();
    if (roleError) throw new Error(roleError.message);
    if (role?.role === "parent") {
      const { data: link, error: linkError } = await context.supabase.from("parent_students").select("student_id").eq("parent_id", context.userId).eq("student_id", data.id).maybeSingle();
      if (linkError || !link) throw new Response("Forbidden", { status: 403 });
    } else if (role?.role !== "admin") {
      throw new Response("Forbidden", { status: 403 });
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: records, error } = await supabaseAdmin.from("student_fee_records").select("id,academic_session,due_date,admission_fee,tuition_fee,examination_fee,transport_fee,other_charges,notes,fee_payments(id,receipt_number,amount,payment_date,payment_method,reference_number)").eq("student_id", data.id).order("due_date", { ascending: false });
    if (error) throw new Error(error.message);
    return (records ?? []).map((record) => ({
      ...record,
      payments: Array.isArray(record.fee_payments) ? record.fee_payments : record.fee_payments ? [record.fee_payments] : [],
    }));
  });

export const saveClassAttendance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => saveAttendanceInput.parse(data))
  .handler(async ({ data, context }) => {
    const { data: role, error: roleError } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (roleError) throw new Error(roleError.message);
    if (role?.role !== "admin" && role?.role !== "teacher") {
      throw new Response("Forbidden", { status: 403 });
    }

    const { data: schoolClass, error: classError } = await context.supabase
      .from("classes")
      .select("id,teacher_id")
      .eq("id", data.classId)
      .maybeSingle();
    if (classError) throw new Error(classError.message);
    if (!schoolClass || (role.role === "teacher" && schoolClass.teacher_id !== context.userId)) {
      throw new Response("Forbidden", { status: 403 });
    }

    const studentIds = data.records.map((record) => record.studentId);
    const { data: classStudents, error: studentsError } = await context.supabase
      .from("students")
      .select("id")
      .eq("class_id", data.classId)
      .in("id", studentIds);
    if (studentsError) throw new Error(studentsError.message);
    if ((classStudents ?? []).length !== studentIds.length) {
      throw new Error("Attendance can only be recorded for students in the selected class.");
    }

    const { error: saveError } = await context.supabase.from("attendance_records").upsert(
      data.records.map((record) => ({
        student_id: record.studentId,
        attendance_date: data.attendanceDate,
        status: record.status,
        marked_by: context.userId,
      })),
      { onConflict: "student_id,attendance_date" },
    );
    if (saveError) throw new Error(saveError.message);
    return { ok: true, recorded: data.records.length };
  });

export const getAttendanceReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => attendanceReportInput.parse(data))
  .handler(async ({ data, context }) => {
    if (data.startDate && data.endDate && data.startDate > data.endDate) {
      throw new Error("The start date must be before the end date.");
    }

    const { data: role, error: roleError } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (roleError) throw new Error(roleError.message);
    if (role?.role !== "admin" && role?.role !== "teacher") {
      throw new Response("Forbidden", { status: 403 });
    }

    let query = context.supabase
      .from("attendance_records")
      .select("id,attendance_date,status,students!inner(id,full_name,admission_number,roll_number,class_id,classes!inner(id,name,grade,teacher_id))")
      .order("attendance_date", { ascending: false });

    if (data.classId) query = query.eq("students.class_id", data.classId);
    if (data.startDate) query = query.gte("attendance_date", data.startDate);
    if (data.endDate) query = query.lte("attendance_date", data.endDate);
    if (role.role === "teacher") query = query.eq("students.classes.teacher_id", context.userId);

    const { data: records, error } = await query;
    if (error) throw new Error(error.message);

    return (records ?? []).flatMap((record) => {
      const student = record.students;
      const schoolClass = Array.isArray(student?.classes) ? student.classes[0] : student?.classes;
      if (!student || !schoolClass) return [];
      return [{
        id: record.id,
        attendanceDate: record.attendance_date,
        status: record.status,
        studentName: student.full_name,
        admissionNumber: student.admission_number,
        rollNumber: student.roll_number,
        className: `${schoolClass.grade} · ${schoolClass.name}`,
      }];
    });
  });

export const getAttendanceSummary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => attendanceSummaryInput.parse(data))
  .handler(async ({ data, context }) => {
    await requirePrincipal(context);
    if (data.startDate && data.endDate && data.startDate > data.endDate) {
      throw new Error("The start date must be before the end date.");
    }

    let query = context.supabase
      .from("attendance_records")
      .select("attendance_date,status,students!inner(class_id,classes!inner(id,name,grade))")
      .order("attendance_date");
    if (data.startDate) query = query.gte("attendance_date", data.startDate);
    if (data.endDate) query = query.lte("attendance_date", data.endDate);

    const { data: records, error } = await query;
    if (error) throw new Error(error.message);

    const daily = new Map<string, { date: string; present: number; late: number; absent: number; vacation: number }>();
    const byClass = new Map<string, { className: string; present: number; late: number; absent: number; vacation: number }>();
    for (const record of records ?? []) {
      const student = record.students;
      const schoolClass = Array.isArray(student?.classes) ? student.classes[0] : student?.classes;
      if (!schoolClass) continue;
      const dailyItem = daily.get(record.attendance_date) ?? {
        date: record.attendance_date,
        present: 0,
        late: 0,
        absent: 0,
        vacation: 0,
      };
      const classItem = byClass.get(schoolClass.id) ?? {
        className: `${schoolClass.grade} · ${schoolClass.name}`,
        present: 0,
        late: 0,
        absent: 0,
        vacation: 0,
      };
      dailyItem[record.status] += 1;
      classItem[record.status] += 1;
      daily.set(record.attendance_date, dailyItem);
      byClass.set(schoolClass.id, classItem);
    }
    return {
      daily: Array.from(daily.values()),
      classes: Array.from(byClass.values()).sort((a, b) => a.className.localeCompare(b.className)),
    };
  });
