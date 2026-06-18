import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getMyRoles, landingFor } from "@/lib/roles";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — PERX" }] }),
  component: AuthPage,
});

type Role = "employee" | "employer_admin" | "provider_admin";

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<Role>("employee");
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user) {
        const roles = await getMyRoles();
        navigate({ to: landingFor(roles) });
      }
    });
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back");
        const roles = await getMyRoles();
        navigate({ to: landingFor(roles) });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: { data: { full_name: fullName || email.split("@")[0] }, emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        const userId = data.user?.id;
        if (!userId) throw new Error("No user");

        // Controlled signup: one server-side function handles company + role assignment
        const { error: setupErr } = await supabase.rpc("signup_setup_account", {
          p_role: role,
          p_company_name: companyName || null,
          p_full_name: fullName || null,
        });
        if (setupErr) throw setupErr;
        toast.success("Account created");
        navigate({ to: role === "employer_admin" ? "/employer" : role === "provider_admin" ? "/provider" : "/app" });
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function demoLogin(kind: "employee" | "employer" | "provider") {
    setLoading(true);
    const creds = {
      employee: { email: "era@perx.demo", password: "PerxDemo!2026" },
      employer: { email: "boss@perx.demo", password: "PerxDemo!2026" },
      provider: { email: "gym@perx.demo", password: "PerxDemo!2026" },
    }[kind];
    const { error } = await supabase.auth.signInWithPassword(creds);
    if (error) {
      toast.error("Demo account not seeded yet. Use sign up.");
      setLoading(false);
      return;
    }
    navigate({ to: kind === "employer" ? "/employer" : kind === "provider" ? "/provider" : "/app" });
  }

  return (
    <div className="min-h-screen bg-cream text-ink font-body grid md:grid-cols-2">
      <div className="hidden md:flex flex-col justify-between p-12 bg-accent-orange/10 border-r border-border-soft">
        <span className="font-display text-2xl font-extrabold tracking-tighter uppercase">PERX<span className="text-accent-red">.</span></span>
        <div>
          <h2 className="font-display text-4xl tracking-tight leading-tight mb-4">Mirëmëngjes.</h2>
          <p className="text-foreground/60 max-w-sm text-pretty mb-8">A modern, tax-efficient benefits marketplace built for Tirana — and ready for any city next.</p>
          <div className="space-y-2">
            <button onClick={() => demoLogin("employee")} className="block w-full text-left bg-white border border-border-soft rounded-2xl p-4 hover:border-accent-red transition-colors">
              <div className="text-xs font-bold text-accent-red uppercase tracking-widest mb-1">Demo · Employee</div>
              <div className="text-sm font-semibold">Era at Gjirafa Tech</div>
            </button>
            <button onClick={() => demoLogin("employer")} className="block w-full text-left bg-white border border-border-soft rounded-2xl p-4 hover:border-accent-red transition-colors">
              <div className="text-xs font-bold text-accent-red uppercase tracking-widest mb-1">Demo · Employer</div>
              <div className="text-sm font-semibold">Gjirafa Tech HR</div>
            </button>
            <button onClick={() => demoLogin("provider")} className="block w-full text-left bg-white border border-border-soft rounded-2xl p-4 hover:border-accent-red transition-colors">
              <div className="text-xs font-bold text-accent-red uppercase tracking-widest mb-1">Demo · Provider</div>
              <div className="text-sm font-semibold">Iron Gym Tirana</div>
            </button>
          </div>
        </div>
        <p className="text-xs text-foreground/40">Built in 48 hours · Tirana, Albania</p>
      </div>

      <div className="flex items-center justify-center p-8">
        <form onSubmit={submit} className="w-full max-w-sm space-y-5">
          <div>
            <h1 className="font-display text-3xl tracking-tight mb-1">{mode === "signin" ? "Welcome back" : "Create account"}</h1>
            <p className="text-sm text-foreground/60">{mode === "signin" ? "Sign in to your PERX wallet." : "Choose how you'll use PERX."}</p>
          </div>

          {mode === "signup" && (
            <>
              <Field label="Full name" value={fullName} onChange={setFullName} />
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-foreground/50 mb-2 block">I'm joining as</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["employee","employer_admin","provider_admin"] as const).map((r) => (
                    <button type="button" key={r} onClick={() => setRole(r)}
                      className={`text-xs font-bold px-2 py-2.5 rounded-xl border ${role===r?"bg-ink text-cream border-ink":"bg-white border-border-soft hover:border-ink/30"}`}>
                      {r === "employee" ? "Employee" : r === "employer_admin" ? "Employer" : "Provider"}
                    </button>
                  ))}
                </div>
              </div>
              {role !== "employee" && (
                <Field label={role === "employer_admin" ? "Company name" : "Business name"} value={companyName} onChange={setCompanyName} />
              )}
            </>
          )}
          <Field label="Email" type="email" value={email} onChange={setEmail} />
          <Field label="Password" type="password" value={password} onChange={setPassword} />

          <button type="submit" disabled={loading} className="w-full bg-ink text-cream rounded-2xl py-4 font-bold hover:bg-accent-red transition-colors disabled:opacity-50">
            {loading ? "..." : mode === "signin" ? "Sign in" : "Create account"}
          </button>
          <button type="button" onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="w-full text-sm text-foreground/60 hover:text-ink">
            {mode === "signin" ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-widest text-foreground/50 mb-2 block">{label}</span>
      <input type={type} required value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white border border-border-soft rounded-2xl px-5 py-3.5 outline-none focus:border-ink transition-colors text-sm" />
    </label>
  );
}