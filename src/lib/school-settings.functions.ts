import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requirePrincipal } from "./school-admin.functions";

const schoolSettingsInput = z.object({
  schoolName: z.string().trim().min(2).max(160),
  logoUrl: z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((value) => value || null)
    .refine((value) => value === null || !value.includes("://") || z.string().url().safeParse(value).success, {
      message: "Logo link must be valid.",
    }),
  address: z.string().trim().max(500),
  phone: z.string().trim().max(40),
  email: z.string().trim().email().or(z.literal("")),
  principalName: z.string().trim().min(2).max(100),
  affiliationBoard: z.string().trim().max(160),
  academicSession: z.string().trim().min(4).max(40),
  workingDays: z.array(z.string().min(3).max(12)).min(1).max(7),
  openingTime: z.string().regex(/^\d{2}:\d{2}$/),
  closingTime: z.string().regex(/^\d{2}:\d{2}$/),
  themeColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});

export const getPublicSchoolBranding = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("school_settings")
    .select("school_name,logo_url,theme_color,principal_name")
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (
    data ?? {
      school_name: "Riverstone Heights Academy",
      logo_url: null,
      theme_color: "#264653",
      principal_name: "",
    }
  );
});

export const saveSchoolSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => schoolSettingsInput.parse(data))
  .handler(async ({ data, context }) => {
    await requirePrincipal(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: current, error: currentError } = await supabaseAdmin
      .from("school_settings")
      .select("id")
      .limit(1)
      .maybeSingle();

    if (currentError) throw new Error(currentError.message);

    const payload = {
      school_name: data.schoolName,
      logo_url: data.logoUrl,
      address: data.address,
      phone: data.phone,
      email: data.email,
      principal_name: data.principalName,
      affiliation_board: data.affiliationBoard,
      academic_session: data.academicSession,
      working_days: data.workingDays,
      opening_time: data.openingTime,
      closing_time: data.closingTime,
      theme_color: data.themeColor,
      updated_by: context.userId,
    };

    const result = current
      ? await supabaseAdmin.from("school_settings").update(payload).eq("id", current.id)
      : await supabaseAdmin.from("school_settings").insert(payload);
    if (result.error) throw new Error(result.error.message);

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({ full_name: payload.principal_name })
      .eq("id", context.userId);
    if (profileError) throw new Error(profileError.message);

    return {
      school_name: payload.school_name,
      logo_url: payload.logo_url,
      theme_color: payload.theme_color,
      principal_name: payload.principal_name,
    };
  });
