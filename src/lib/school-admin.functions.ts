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

const attendanceStatus = z.enum(["present", "late", "absent"]);
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

    const daily = new Map<string, { date: string; present: number; late: number; absent: number }>();
    const byClass = new Map<string, { className: string; present: number; late: number; absent: number }>();
    for (const record of records ?? []) {
      const student = record.students;
      const schoolClass = Array.isArray(student?.classes) ? student.classes[0] : student?.classes;
      if (!schoolClass) continue;
      const dailyItem = daily.get(record.attendance_date) ?? {
        date: record.attendance_date,
        present: 0,
        late: 0,
        absent: 0,
      };
      const classItem = byClass.get(schoolClass.id) ?? {
        className: `${schoolClass.grade} · ${schoolClass.name}`,
        present: 0,
        late: 0,
        absent: 0,
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
