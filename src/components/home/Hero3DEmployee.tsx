import { Suspense, lazy, useEffect, useState } from "react";

const Scene = lazy(() => import("./HomeHeroScene"));

export function Hero3DEmployee({
  spent,
  budget,
  simTotal = 0,
}: {
  // legacy props accepted but ignored (compact bento variant)
  greeting?: string;
  firstName?: string;
  spent: number;
  budget: number;
  offersNear?: number;
  simTotal?: number;
}) {
  const [mounted, setMounted] = useState(false);
  const [light, setLight] = useState(false);
  useEffect(() => {
    setMounted(true);
    const mq = window.matchMedia("(max-width: 768px), (prefers-reduced-motion: reduce)");
    setLight(mq.matches);
  }, []);

  const remaining = Math.max(0, budget - spent - simTotal);
  const over = budget - spent - simTotal < 0;

  return (
    <div className="relative h-full min-h-[420px] md:min-h-[560px] w-full">
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

      <div className="relative h-full flex flex-col justify-between p-6 md:p-9">
        <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-ink-soft">
          Your wallet · this month
        </div>
        <div className="max-w-md">
          <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-ink-soft mb-2">
            {over ? "Over budget" : "Remaining"}
          </div>
          <div className={`font-serif text-6xl md:text-8xl leading-none tracking-tight ${over ? "text-accent-red" : "text-ink"}`}>
            {remaining.toLocaleString()}<span className="text-2xl md:text-3xl text-ink-soft ml-2 align-middle">ALL</span>
          </div>
          <div className="text-sm text-ink-soft mt-3">
            of {budget.toLocaleString()} ALL · {spent.toLocaleString()} pending{simTotal ? ` · ${simTotal.toLocaleString()} simulated` : ""}
          </div>
        </div>
      </div>
    </div>
  );
}