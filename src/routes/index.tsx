import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getMyRoles, landingFor } from "@/lib/roles";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PERX — Tax-free benefits your team actually wants" },
      { name: "description", content: "PERX turns company welfare into something employees love — gyms, meals, travel and learning, funded as tax-efficient benefits, paid straight to providers." },
      { property: "og:title", content: "PERX — Benefits employees actually open" },
      { property: "og:description", content: "An AI-powered marketplace bringing modern tax-efficient benefits to Albania." },
    ],
  }),
  component: Landing,
});

type Role = "employee" | "employer_admin" | "provider_admin";

function Landing() {
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
        if (!data.user?.id) throw new Error("No user");
        const { error: setupErr } = await supabase.rpc("signup_setup_account", {
          p_role: role,
          p_company_name: companyName || undefined,
          p_full_name: fullName || undefined,
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
    <div className="min-h-screen bg-cream text-ink font-body">
      <nav className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <span className="font-serif text-2xl tracking-tight">PERX<span className="text-accent-red">.</span></span>
        <a href="#enter" className="text-sm font-semibold hover:text-accent-red transition-colors">Sign in ↓</a>
      </nav>

      <section className="max-w-7xl mx-auto px-6 pt-10 md:pt-16 pb-20 grid lg:grid-cols-12 gap-10 lg:gap-16 items-start fade-up">
        {/* LEFT — editorial */}
        <div className="lg:col-span-7">
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-ink-soft mb-6">Issue 01 · Tirana, 2026</div>
          <h1 className="font-serif text-5xl md:text-7xl lg:text-8xl leading-[0.95] tracking-tight text-balance">
            Benefits that <em className="text-accent-red">feel</em> like a Friday in Blloku.
          </h1>
          <p className="text-ink-soft text-lg max-w-md mt-8 text-pretty">
            Tax-efficient gyms, meals, weekends and courses — picked by your team, paid straight to local providers.
          </p>

          <div className="mt-10 relative aspect-[5/3] rounded-3xl overflow-hidden hairline max-w-xl">
            <img src="https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=1200" alt="A Tirana cafe at golden hour" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute bottom-0 inset-x-0 p-6 bg-gradient-to-t from-ink/70 to-transparent">
              <div className="text-cream/70 text-[10px] uppercase tracking-[0.18em] font-semibold mb-1">Featured</div>
              <div className="text-cream font-serif text-2xl leading-tight">Komiteti, Pazari i Ri</div>
            </div>
          </div>

          <div className="mt-10 grid md:grid-cols-3 gap-px bg-border-soft hairline rounded-3xl overflow-hidden max-w-xl">
            <Row title="Employees" body="Browse real Tirana providers. Build packages with AI." />
            <Row title="Employers" body="Set budgets, approve in a click. Tax-efficient by design." />
            <Row title="Providers" body="List your space. Get paid when employers approve." />
          </div>
        </div>

        {/* RIGHT — auth */}
        <div id="enter" className="lg:col-span-5 lg:sticky lg:top-10">
          <div className="bg-white border border-border-soft rounded-3xl p-7 md:p-9 shadow-[0_30px_60px_-30px_rgba(20,15,10,0.18)]">
            <div className="flex items-center gap-1 p-1 rounded-full bg-cream border border-border-soft w-fit mb-6">
              {(["signin","signup"] as const).map((m) => (
                <button key={m} type="button" onClick={() => setMode(m)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest transition-colors ${mode===m?"bg-ink text-cream":"text-ink-soft hover:text-ink"}`}>
                  {m === "signin" ? "Sign in" : "Create account"}
                </button>
              ))}
            </div>

            <h2 className="font-serif text-3xl tracking-tight mb-1">
              {mode === "signin" ? "Welcome back." : "Join PERX."}
            </h2>
            <p className="text-sm text-ink-soft mb-6">
              {mode === "signin" ? "Open your wallet, your team, or your shop." : "Pick how you'll use PERX."}
            </p>

            <form onSubmit={submit} className="space-y-4">
              {mode === "signup" && (
                <>
                  <Field label="Full name" value={fullName} onChange={setFullName} />
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-soft mb-2 block">I'm joining as</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(["employee","employer_admin","provider_admin"] as const).map((r) => (
                        <button type="button" key={r} onClick={() => setRole(r)}
                          className={`text-xs font-bold px-2 py-2.5 rounded-xl border transition-colors ${role===r?"bg-ink text-cream border-ink":"bg-cream border-border-soft hover:border-ink/30"}`}>
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
            </form>

            <div className="mt-7 pt-6 border-t border-border-soft">
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-soft mb-3">Try a demo account</div>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { k: "employee", label: "Era", sub: "Employee" },
                  { k: "employer", label: "Gjirafa HR", sub: "Employer" },
                  { k: "provider", label: "Iron Gym", sub: "Provider" },
                ] as const).map((d) => (
                  <button key={d.k} type="button" onClick={() => demoLogin(d.k)} disabled={loading}
                    className="text-left bg-cream border border-border-soft rounded-2xl p-3 hover:border-accent-red transition-colors disabled:opacity-50">
                    <div className="text-[9px] font-bold text-accent-red uppercase tracking-widest">{d.sub}</div>
                    <div className="text-xs font-semibold mt-0.5">{d.label}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="max-w-7xl mx-auto px-6 py-10 text-xs text-ink-soft flex justify-between hairline border-t">
        <span>PERX · Made in Tirana</span>
        <span>© 2026</span>
      </footer>
    </div>
  );
}

function Row({ title, body }: { title: string; body: string }) {
  return (
    <div className="bg-cream p-5">
      <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-accent-red mb-2">{title}</div>
      <p className="font-serif text-base leading-snug text-pretty">{body}</p>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="block">
      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-soft mb-2 block">{label}</span>
      <input type={type} required value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full bg-cream border border-border-soft rounded-2xl px-5 py-3.5 outline-none focus:border-ink transition-colors text-sm" />
    </label>
  );
}
