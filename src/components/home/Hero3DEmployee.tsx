import { TransferFundsButton } from "@/components/TransferFundsButton";

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
  const remaining = Math.max(0, budget - spent - simTotal);
  const over = budget - spent - simTotal < 0;
  const pct = budget > 0 ? Math.min(1, (spent + simTotal) / budget) : 0;

  return (
    <div className="relative h-full min-h-[420px] md:min-h-[560px] w-full">
      <div className="absolute inset-0 bg-gradient-to-br from-paper via-cream to-sage-soft" />
      <div className="absolute inset-0 pointer-events-none opacity-[0.05] mix-blend-multiply"
        style={{ backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence baseFrequency='0.85'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")" }} />

      <div className="relative h-full flex flex-col justify-between p-6 md:p-9">
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-ink-soft">
          <span className="inline-block size-1.5 rounded-full bg-sage" />
          Your wallet · this month
        </div>
        <div className="max-w-md">
          <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-ink-soft mb-2">
            {over ? "Over budget" : "Remaining"}
          </div>
          <div className={`font-serif text-6xl md:text-8xl leading-none tracking-tight ${over ? "text-accent-red" : "text-ink"}`}>
            {remaining.toLocaleString()}<span className="text-2xl md:text-3xl text-ink-soft ml-2 align-middle">ALL</span>
          </div>
          <div className="mt-5 h-1.5 w-full max-w-sm rounded-full bg-cream/60 overflow-hidden hairline">
            <div className={`h-full rounded-full ${over ? "bg-accent-red" : "bg-sage"}`} style={{ width: `${Math.max(2, pct * 100)}%` }} />
          </div>
          <div className="text-sm text-ink-soft mt-3">
            of {budget.toLocaleString()} ALL · {spent.toLocaleString()} pending{simTotal ? ` · ${simTotal.toLocaleString()} simulated` : ""}
          </div>
          <div className="mt-5">
            <TransferFundsButton remaining={remaining} />
          </div>
        </div>
      </div>
    </div>
  );
}