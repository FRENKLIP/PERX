import { useEffect, useState } from "react";
import { useReveal } from "./useReveal";

const STATS = [
  { v: 120, suf: "+", label: "Tirana providers" },
  { v: 14, suf: "", label: "Neighborhoods" },
  { v: 38, suf: "M", label: "ALL paid to local biz" },
  { v: 2, suf: "", label: "Languages, no compromise" },
];

function Counter({ target, suffix }: { target: number; suffix: string }) {
  const [v, setV] = useState(0);
  const { ref, shown } = useReveal<HTMLDivElement>(0.3);
  useEffect(() => {
    if (!shown) return;
    const start = performance.now();
    const dur = 1400;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setV(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [shown, target]);
  return (
    <div ref={ref} className="font-serif text-6xl md:text-8xl tracking-tight tabular-nums">
      {v}<span className="text-accent-red">{suffix}</span>
    </div>
  );
}

export default function CountersStrip() {
  return (
    <section className="bg-ink text-cream">
      <div className="max-w-7xl mx-auto px-6 py-28 grid grid-cols-2 md:grid-cols-4 gap-10">
        {STATS.map((s) => (
          <div key={s.label}>
            <Counter target={s.v} suffix={s.suf} />
            <div className="text-cream/60 text-xs uppercase tracking-[0.2em] mt-4 font-semibold">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}