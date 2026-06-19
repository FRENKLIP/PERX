import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getMyRoles, landingFor } from "@/lib/roles";
import Hero3D from "@/components/landing/Hero3D";
import Marquee from "@/components/landing/Marquee";
import HowItWorks, { SectionLabel } from "@/components/landing/HowItWorks";
import BentoGrid from "@/components/landing/BentoGrid";
import CountersStrip from "@/components/landing/CountersStrip";
import AudiencePanels from "@/components/landing/AudiencePanels";
import FAQ from "@/components/landing/FAQ";
import CursorRing from "@/components/landing/CursorRing";

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
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user) {
        const roles = await getMyRoles();
        navigate({ to: landingFor(roles) });
      }
    });
  }, [navigate]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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
      <CursorRing />

      <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${scrolled ? "bg-cream/85 backdrop-blur-md border-b border-border-soft" : "bg-transparent"}`}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="#top" className={`font-serif tracking-tight transition-all ${scrolled ? "text-xl" : "text-2xl"}`}>
            PERX<span className="text-accent-red">.</span>
          </a>
          <div className="hidden md:flex items-center gap-8 text-xs font-bold uppercase tracking-[0.18em] text-ink-soft">
            <a href="#how" className="hover:text-ink transition-colors">How</a>
            <a href="#what" className="hover:text-ink transition-colors">Product</a>
            <a href="#who" className="hover:text-ink transition-colors">For you</a>
            <a href="#faq" className="hover:text-ink transition-colors">FAQ</a>
          </div>
          <a href="#enter" className="text-xs font-bold uppercase tracking-[0.2em] bg-ink text-cream px-4 py-2.5 rounded-full hover:bg-accent-red transition-colors">
            Sign in
          </a>
        </div>
      </nav>

      {/* HERO */}
      <section id="top" className="max-w-7xl mx-auto px-6 pt-32 md:pt-40 pb-24 grid lg:grid-cols-12 gap-12 lg:gap-16 items-center fade-up">
        <div className="lg:col-span-7">
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-ink-soft mb-6">Issue 01 · Tirana, 2026</div>
          <h1 className="font-serif text-6xl md:text-8xl lg:text-[9rem] leading-[0.92] tracking-tight text-balance">
            Benefits that <em className="text-accent-red">feel</em> like a Friday in Blloku.
          </h1>
          <p className="text-ink-soft text-lg max-w-md mt-8 text-pretty">
            Tax-efficient gyms, meals, weekends and courses — picked by your team, paid straight to local providers.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <a href="#enter" className="bg-ink text-cream px-7 py-4 rounded-full font-bold text-sm hover:bg-accent-red transition-colors">
              Start free
            </a>
            <a href="#how" className="text-sm font-semibold hover:text-accent-red transition-colors story-link">
              See how it works
            </a>
          </div>
        </div>
        <div className="lg:col-span-5">
          <Hero3D />
        </div>
      </section>

      <Marquee />

      <div id="how"><HowItWorks /></div>
      <div id="what"><BentoGrid /></div>

      {/* Editorial parallax spread */}
      <section className="relative h-[70vh] overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center scale-110"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=1800')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/30 to-transparent" />
        <div className="relative max-w-5xl mx-auto px-6 h-full flex flex-col justify-end pb-20">
          <div className="text-cream/70 text-[10px] uppercase tracking-[0.24em] font-bold mb-4">Editor's note</div>
          <p className="font-serif text-4xl md:text-6xl text-cream leading-[1.05] max-w-3xl text-balance">
            "A salary tells you what a company can afford. A perk tells you who they <em className="text-accent-red">are</em>."
          </p>
        </div>
      </section>

      <CountersStrip />

      <div id="who"><AudiencePanels /></div>

      <div id="faq"><FAQ /></div>

      {/* AUTH */}
      <section id="enter" className="bg-paper py-32">
        <div className="max-w-6xl mx-auto px-6 grid lg:grid-cols-12 gap-12 items-start">
          <div className="lg:col-span-6">
            <SectionLabel index="06" label="Get in" />
            <h2 className="font-serif text-5xl md:text-7xl tracking-tight mt-6 leading-[1]">
              Open your <em className="text-accent-red">PERX</em>.
            </h2>
            <p className="text-ink-soft text-lg max-w-md mt-6">
              One account, three doors: employee wallet, HR control room, or provider listing.
            </p>
          </div>
          <div className="lg:col-span-6">
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
        </div>
      </section>

      <footer className="bg-ink text-cream">
        <div className="max-w-7xl mx-auto px-6 py-16 grid md:grid-cols-2 gap-10">
          <div>
            <div className="font-serif text-4xl tracking-tight">PERX<span className="text-accent-red">.</span></div>
            <p className="text-cream/60 mt-4 max-w-sm text-sm">Tax-efficient benefits, paid straight to local providers. Made in Tirana for teams that care.</p>
          </div>
          <div className="grid grid-cols-3 gap-6 text-xs uppercase tracking-[0.18em] font-bold">
            <div>
              <div className="text-cream/40 mb-3">Product</div>
              <ul className="space-y-2 text-cream/80 normal-case tracking-normal font-medium">
                <li><a href="#how" className="hover:text-sage">How it works</a></li>
                <li><a href="#what" className="hover:text-sage">Features</a></li>
                <li><a href="#faq" className="hover:text-sage">FAQ</a></li>
              </ul>
            </div>
            <div>
              <div className="text-cream/40 mb-3">For</div>
              <ul className="space-y-2 text-cream/80 normal-case tracking-normal font-medium">
                <li><a href="#who" className="hover:text-sage">Employees</a></li>
                <li><a href="#who" className="hover:text-sage">Employers</a></li>
                <li><a href="#who" className="hover:text-sage">Providers</a></li>
              </ul>
            </div>
            <div>
              <div className="text-cream/40 mb-3">Company</div>
              <ul className="space-y-2 text-cream/80 normal-case tracking-normal font-medium">
                <li>Tirana, AL</li>
                <li>hello@perx.al</li>
              </ul>
            </div>
          </div>
        </div>
        <div className="border-t border-cream/10">
          <div className="max-w-7xl mx-auto px-6 py-6 flex justify-between text-xs text-cream/50">
            <span>PERX · Made in Tirana</span>
            <span>© 2026</span>
          </div>
        </div>
      </footer>
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
