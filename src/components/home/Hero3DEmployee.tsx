import { Suspense, lazy, useEffect, useState } from "react";
import { WalletRing } from "@/components/WalletRing";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles } from "lucide-react";

const Scene = lazy(() => import("./HomeHeroScene"));

export function Hero3DEmployee({
  greeting,
  firstName,
  spent,
  budget,
  offersNear,
  simTotal = 0,
}: {
  greeting: string;
  firstName: string;
  spent: number;
  budget: number;
  offersNear: number;
  simTotal?: number;
}) {
  const [mounted, setMounted] = useState(false);
  const [light, setLight] = useState(false);
  useEffect(() => {
    setMounted(true);
    const mq = window.matchMedia("(max-width: 768px), (prefers-reduced-motion: reduce)");
    setLight(mq.matches);
  }, []);

  const daysLeft = (() => {
    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return Math.max(1, Math.ceil((+next - +now) / 86400000));
  })();

  return (
    <section className="relative overflow-hidden rounded-[2rem] hairline bg-paper">
      <div className="absolute inset-0">
        {mounted && !light ? (
          <Suspense fallback={null}>
            <Scene budget={budget} spent={spent} simTotal={simTotal} />
          </Suspense>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-paper via-cream to-paper" />
        )}
      </div>
      <div className="absolute inset-0 pointer-events-none opacity-[0.05] mix-blend-multiply"
        style={{ backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence baseFrequency='0.85'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")" }} />

      <div className="relative grid md:grid-cols-12 gap-8 items-center p-8 md:p-12 min-h-[520px]">
        <div className="md:col-span-7">
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-ink-soft mb-4">
            {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
          </div>
          <h1 className="font-serif text-5xl md:text-7xl leading-[0.95] tracking-tight text-balance">
            {greeting}, {firstName}.<br />
            <em className="text-accent-red">What sounds good?</em>
          </h1>
          <p className="text-ink-soft text-lg mt-6 max-w-md text-pretty">
            Drag, drop, explore — your tax-free wallet is yours to shape this month.
          </p>
          <div className="flex flex-wrap gap-3 mt-8">
            <Link to="/concierge" className="inline-flex items-center gap-2 bg-ink text-cream px-6 py-3 rounded-full text-sm font-semibold hover:bg-accent-red transition-colors">
              <Sparkles className="size-4" /> Ask concierge
            </Link>
            <Link to="/marketplace" className="inline-flex items-center gap-2 hairline rounded-full px-6 py-3 text-sm font-semibold hover:bg-paper bg-cream/70 backdrop-blur">
              Browse marketplace <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
        <div className="md:col-span-5 grid place-items-center">
          <div className="bg-cream/70 backdrop-blur-md rounded-full p-4 hairline">
            <WalletRing spent={spent} budget={budget} />
          </div>
        </div>
      </div>

      <div className="relative grid grid-cols-3 divide-x divide-border-soft bg-cream/80 backdrop-blur border-t border-border-soft">
        <Stat label="Refreshes in" value={`${daysLeft}d`} />
        <Stat label="Untouched" value={`${Math.max(0, budget - spent).toLocaleString()} ALL`} />
        <Stat label="Offers near you" value={String(offersNear)} />
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-5 md:p-6">
      <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-ink-soft">{label}</div>
      <div className="font-serif text-2xl md:text-3xl mt-1">{value}</div>
    </div>
  );
}