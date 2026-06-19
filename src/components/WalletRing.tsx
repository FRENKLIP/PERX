import { useEffect, useState } from "react";
import { formatAll } from "@/lib/i18n";

type Props =
  | { spent: number; budget: number; size?: number; daysLeft?: undefined; daysInMonth?: undefined; dark?: boolean }
  | { daysLeft: number; daysInMonth?: number; size?: number; spent?: undefined; budget?: undefined; dark?: boolean };

export function WalletRing(props: Props) {
  const size = props.size ?? 220;
  const dark = props.dark ?? false;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;

  const daysMode = typeof props.daysLeft === "number";
  const daysInMonth = daysMode
    ? props.daysInMonth ?? new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
    : 0;
  const target = daysMode
    ? Math.min(1, Math.max(0, 1 - (props.daysLeft as number) / Math.max(1, daysInMonth)))
    : Math.min(1, (props.budget ?? 0) > 0 ? (props.spent ?? 0) / (props.budget as number) : 0);

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

  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke={dark ? "rgba(250,247,242,0.12)" : "var(--color-border-soft)"} strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          stroke="var(--color-sage)" strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - t)}
          style={{ transition: "stroke 0.3s" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        {daysMode ? (
          <div className="px-6">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-ink-soft">Refreshes in</div>
            <div className="font-serif text-3xl mt-1 leading-none">{props.daysLeft} days</div>
            <div className="text-xs text-ink-soft mt-1">of {daysInMonth} days</div>
          </div>
        ) : (
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-ink-soft">Remaining</div>
            <div className="font-serif text-3xl mt-1">{formatAll(Math.max(0, (props.budget ?? 0) - (props.spent ?? 0)))}</div>
            <div className="text-xs text-ink-soft mt-1">of {formatAll(props.budget ?? 0)}</div>
          </div>
        )}
      </div>
    </div>
  );
}