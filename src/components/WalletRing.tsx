import { useEffect, useState } from "react";
import { formatAll } from "@/lib/i18n";

export function WalletRing({ spent, budget, size = 220 }: { spent: number; budget: number; size?: number }) {
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const target = Math.min(1, budget > 0 ? spent / budget : 0);
  const [t, setT] = useState(0);

  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const dur = 1100;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setT(eased * target);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);

  const remaining = Math.max(0, budget - spent);

  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--color-border-soft)" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          stroke="var(--color-sage)" strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - t)}
          style={{ transition: "stroke 0.3s" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-ink-soft">Remaining</div>
          <div className="font-serif text-3xl mt-1">{formatAll(remaining)}</div>
          <div className="text-xs text-ink-soft mt-1">of {formatAll(budget)}</div>
        </div>
      </div>
    </div>
  );
}