import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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

async function requirePrincipal(context: { supabase: { from: (table: "user_roles") => any }; userId: string }) {
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
      .upsert({ user_id: teacherId, role: "teacher" }, { onConflict: "user_id" });
    if (assignmentError) throw new Error(assignmentError.message);

    return { id: teacherId, fullName: data.fullName };
  });

export const updateTeacherAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => teacherUpdateInput.parse(data))
  .handler(async ({ data, context }) => {
    await requirePrincipal(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("profiles").update({ full_name: data.fullName }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteTeacherAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => teacherDeleteInput.parse(data))
  .handler(async ({ data, context }) => {
    await requirePrincipal(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: classError } = await supabaseAdmin.from("classes").update({ teacher_id: null }).eq("teacher_id", data.id);
    if (classError) throw new Error(classError.message);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });