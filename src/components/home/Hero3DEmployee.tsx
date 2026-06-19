type Suggestion = {
  id: string;
  title: string;
  price_all: number;
  category_slug?: string | null;
  companies?: { name?: string | null; neighborhood?: string | null } | null;
};

const categoryEmoji: Record<string, string> = {
  wellness: "🧘",
  food: "🍴",
  travel: "🏔",
  learning: "📚",
  family: "🎈",
  tech: "💡",
  lifestyle: "✨",
};

export function Hero3DEmployee({
  spent,
  budget,
  simTotal = 0,
  suggestion,
  onAdd,
}: {
  // legacy props accepted but ignored (compact bento variant)
  greeting?: string;
  firstName?: string;
  spent: number;
  budget: number;
  offersNear?: number;
  simTotal?: number;
  suggestion?: Suggestion | null;
  onAdd?: (offerId: string) => void;
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

        {suggestion && (
          <div className="max-w-md">
            <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-ink-soft mb-3">Perk of the day</div>
            <div className="hairline rounded-3xl bg-cream/70 backdrop-blur-sm p-5 md:p-6 flex items-start gap-4 shadow-[0_10px_30px_-20px_rgba(20,15,10,0.25)]">
              <div className="size-12 shrink-0 rounded-2xl bg-sage-soft grid place-items-center text-2xl">
                {categoryEmoji[suggestion.category_slug ?? ""] ?? "✨"}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-sage-deep">
                  Try {suggestion.companies?.name ?? "this"}
                </div>
                <div className="font-serif text-2xl md:text-3xl leading-tight tracking-tight mt-1 truncate">
                  {suggestion.title}
                </div>
                <div className="flex items-center justify-between mt-3 gap-3">
                  <div className="text-sm text-ink-soft">
                    <strong className="text-ink font-bold">{suggestion.price_all.toLocaleString()} ALL</strong>
                    {suggestion.companies?.neighborhood ? ` · ${suggestion.companies.neighborhood}` : ""}
                  </div>
                  {onAdd && (
                    <button
                      onClick={() => onAdd(suggestion.id)}
                      className="bg-ink text-cream text-[11px] font-bold uppercase tracking-[0.18em] px-4 py-2 rounded-full hover:bg-sage transition-colors"
                    >
                      Add
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

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
        </div>
      </div>
    </div>
  );
}