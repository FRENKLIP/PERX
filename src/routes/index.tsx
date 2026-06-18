import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

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

function Landing() {
  return (
    <div className="min-h-screen bg-cream text-ink font-body">
      <nav className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <span className="font-serif text-2xl tracking-tight">PERX<span className="text-accent-red">.</span></span>
        <Link to="/auth" className="text-sm font-semibold hover:text-accent-red transition-colors">Sign in →</Link>
      </nav>

      <section className="max-w-6xl mx-auto px-6 pt-16 md:pt-24 pb-16 grid md:grid-cols-12 gap-10 items-end fade-up">
        <div className="md:col-span-7">
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-ink-soft mb-6">Issue 01 · Tirana, 2026</div>
          <h1 className="font-serif text-6xl md:text-8xl leading-[0.95] tracking-tight text-balance">
            Benefits that <em className="text-accent-red">feel</em> like a Friday in Blloku.
          </h1>
          <p className="text-ink-soft text-lg max-w-md mt-8 text-pretty">
            Tax-efficient gyms, meals, weekends and courses — picked by your team, paid straight to local providers.
          </p>
          <Link to="/auth" className="inline-flex items-center gap-2 mt-10 bg-ink text-cream px-7 py-4 rounded-full font-semibold hover:bg-accent-red transition-colors">
            Start exploring <ArrowRight className="size-4" />
          </Link>
        </div>
        <div className="md:col-span-5 relative aspect-[4/5] rounded-3xl overflow-hidden hairline">
          <img src="https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=1200" alt="A Tirana cafe at golden hour" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute bottom-0 inset-x-0 p-6 bg-gradient-to-t from-ink/70 to-transparent">
            <div className="text-cream/70 text-[10px] uppercase tracking-[0.18em] font-semibold mb-1">Featured</div>
            <div className="text-cream font-serif text-2xl leading-tight">Komiteti, Pazari i Ri</div>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-24 grid md:grid-cols-3 gap-px bg-border-soft hairline rounded-3xl overflow-hidden">
        <Row title="For employees" body="Browse real Tirana providers. Build packages with an AI concierge. Spend nothing — your employer funds it." />
        <Row title="For employers" body="Set monthly budgets, approve in a click, see what your team actually values. Tax-efficient by design." />
        <Row title="For providers" body="List your space. Reach motivated locals. Get paid directly when employers approve." />
      </section>

      <footer className="max-w-6xl mx-auto px-6 py-10 text-xs text-ink-soft flex justify-between hairline border-t">
        <span>PERX · Made in Tirana</span>
        <span>© 2026</span>
      </footer>
    </div>
  );
}

function Row({ title, body }: { title: string; body: string }) {
  return (
    <div className="bg-cream p-8">
      <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-accent-red mb-3">{title}</div>
      <p className="font-serif text-xl leading-snug text-pretty">{body}</p>
    </div>
  );
}
