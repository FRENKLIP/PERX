import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles, ShoppingBag, Briefcase, Store } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Perka — Tax-free benefits your team actually wants" },
      { name: "description", content: "Perka turns company welfare into something employees love — gyms, meals, travel and learning, funded as tax-efficient benefits, paid straight to providers." },
      { property: "og:title", content: "Perka — Benefits employees actually open" },
      { property: "og:description", content: "An AI-powered marketplace bringing modern tax-efficient benefits to Albania." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-cream text-ink font-body">
      <nav className="px-6 py-5 flex items-center justify-between max-w-7xl mx-auto">
        <span className="font-display text-xl font-extrabold tracking-tighter uppercase">Perka<span className="text-accent-red">.</span></span>
        <Link to="/auth" className="text-sm font-semibold px-5 py-2 rounded-full border border-ink/10 hover:bg-ink/5">Sign in</Link>
      </nav>

      <section className="max-w-5xl mx-auto px-6 pt-16 pb-12 text-center">
        <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-accent-red bg-accent-red/10 px-3 py-1.5 rounded-full mb-6">
          <Sparkles className="size-3" /> Built for Tirana, ready for everywhere
        </span>
        <h1 className="font-display text-5xl md:text-7xl tracking-tight leading-[1.05] text-balance mb-6">
          The benefits your team<br/><span className="text-accent-red italic">actually opens.</span>
        </h1>
        <p className="text-foreground/60 max-w-xl mx-auto text-lg text-pretty mb-10">
          Tax-efficient gyms, meals, travel, and learning — funded by employers, paid directly to providers, picked by employees through a marketplace they want to return to.
        </p>
        <Link to="/auth" className="inline-flex items-center gap-2 bg-ink text-cream px-7 py-4 rounded-2xl font-bold hover:bg-accent-red transition-colors">
          Start exploring <ArrowRight className="size-4" />
        </Link>
      </section>

      <section className="max-w-6xl mx-auto px-6 grid md:grid-cols-3 gap-4 pb-20">
        <RoleCard icon={ShoppingBag} title="For employees" body="Browse, build smart packages with an AI concierge, redeem instantly. Pay nothing — your employer funds it." accent="bg-accent-orange text-white" />
        <RoleCard icon={Briefcase} title="For employers" body="Set monthly budgets, approve in one click, see what your people actually value. Tax-efficient by design." />
        <RoleCard icon={Store} title="For providers" body="List gyms, restaurants, escapes, courses. Get matched to motivated employees and paid directly." />
      </section>
    </div>
  );
}

function RoleCard({ icon: Icon, title, body, accent }: { icon: any; title: string; body: string; accent?: string }) {
  return (
    <div className={`rounded-[28px] p-7 border border-border-soft ${accent ?? "bg-white"}`}>
      <Icon className="size-7 mb-5" />
      <h3 className="font-display text-2xl mb-2">{title}</h3>
      <p className="text-sm opacity-80 text-pretty">{body}</p>
    </div>
  );
}
