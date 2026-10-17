export type SchoolBranding = {
  school_name: string;
  logo_url: string | null;
  theme_color: string;
  principal_name: string;
};

export const defaultSchoolBranding: SchoolBranding = {
  school_name: "Riverstone Heights Academy",
  logo_url: null,
  theme_color: "#264653",
  principal_name: "",
};

export async function loadSchoolBranding() {
  const { supabase } = await import("@/integrations/supabase/client");
  const { data, error } = await supabase
    .from("school_settings")
    .select("school_name,logo_url,theme_color,principal_name")
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data ?? defaultSchoolBranding) as SchoolBranding;
}

export async function getSchoolLogoUrl(logoPath: string | null) {
  if (!logoPath) return null;
  const { supabase } = await import("@/integrations/supabase/client");
  const { data } = await supabase.storage
    .from("school-branding")
    .createSignedUrl(logoPath, 60 * 60);
  return data?.signedUrl ?? null;
}
