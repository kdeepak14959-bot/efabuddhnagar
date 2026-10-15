import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import schoolMark from "@/assets/riverstone-heights-academy-mark.png";
import {
  defaultSchoolBranding,
  getSchoolLogoUrl,
  loadSchoolBranding,
  type SchoolBranding,
} from "@/lib/school-branding";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Riverstone Heights Academy | School Portal" },
      {
        name: "description",
        content:
          "Secure school portal for Riverstone Heights Academy families, teachers, and leadership.",
      },
      { property: "og:title", content: "Riverstone Heights Academy | School Portal" },
      {
        property: "og:description",
        content:
          "Secure school portal for Riverstone Heights Academy families, teachers, and leadership.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [branding, setBranding] = useState<SchoolBranding>(defaultSchoolBranding);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  useEffect(() => {
    void loadSchoolBranding().then(async (settings) => {
      setBranding(settings);
      setLogoUrl(await getSchoolLogoUrl(settings.logo_url));
    });
  }, []);
  async function redirectByRole() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();
    await navigate({ to: "/dashboard", search: { role: data?.role ?? "parent" } });
  }
  async function signIn(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setMessage(error.message);
    else await redirectByRole();
    setLoading(false);
  }
  async function reset() {
    if (!email) {
      setMessage("Enter your email address first.");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setMessage(error ? error.message : "Password reset link sent. Please check your email.");
  }
  async function google() {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setMessage(result.error.message);
      setLoading(false);
    } else if (!result.redirected) await redirectByRole();
  }
  return (
    <main className="page-backdrop flex min-h-screen items-center justify-center p-5">
      <section className="grid w-full max-w-4xl overflow-hidden rounded-xl bg-card ring-1 ring-ink/5 shadow-xl md:grid-cols-[0.9fr_1.1fr]">
        <aside
          className="p-8 text-primary-foreground md:p-10"
          style={{ backgroundColor: branding.theme_color }}
        >
          <img
            src={logoUrl ?? schoolMark}
            alt={`${branding.school_name} crest`}
            width={64}
            height={64}
            className="size-16 rounded-lg bg-secondary object-contain p-1"
          />
          <p className="mt-6 text-sm font-semibold">{branding.school_name}</p>
          <h1 className="mt-3 font-serif text-4xl leading-tight">
            A place to learn, grow, and belong.
          </h1>
          <p className="mt-5 max-w-xs text-sm leading-6 text-primary-foreground/70">
            A connected school portal for leadership, teachers, and families.
          </p>
        </aside>
        <div className="p-8 md:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-steel">
            School portal
          </p>
          <h2 className="mt-2 font-serif text-3xl">Welcome back</h2>
          <p className="mt-2 text-sm text-steel">Sign in to view your school information.</p>
          <form onSubmit={signIn} className="mt-7 space-y-4">
            <label className="block text-sm font-medium">
              Email
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                required
                className="mt-1.5 h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </label>
            <label className="block text-sm font-medium">
              Password
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                required
                className="mt-1.5 h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </label>
            <Button
              type="submit"
              className="w-full"
              disabled={loading}
              style={{ backgroundColor: branding.theme_color }}
            >
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>
          <Button variant="link" onClick={reset} className="mt-2 h-auto px-0 text-steel">
            Forgot password?
          </Button>
          <div className="my-5 h-px bg-border" />
          <Button variant="outline" onClick={google} disabled={loading} className="w-full">
            Continue with Google
          </Button>
          {message && (
            <p className="mt-4 text-sm text-clay" role="status">
              {message}
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
