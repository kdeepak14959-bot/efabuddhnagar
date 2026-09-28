import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const teacherInput = z.object({
  fullName: z.string().trim().min(2).max(100),
  email: z.string().trim().email(),
  temporaryPassword: z.string().min(8).max(128),
});

export const createTeacherAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => teacherInput.parse(data))
  .handler(async ({ data, context }) => {
    const { data: role, error: roleError } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .maybeSingle();

    if (roleError || role?.role !== "admin") {
      throw new Response("Forbidden", { status: 403 });
    }

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