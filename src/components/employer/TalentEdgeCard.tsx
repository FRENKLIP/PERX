import { Sparkles, RefreshCw } from "lucide-react";
import { CATEGORY_ICONS, CATEGORY_LABELS, type CategoryKey } from "@/lib/categorize";

export type TalentEdge = {
  headline: string;
  recommendations: Array<{ category: CategoryKey; action: string; rationale: string }>;
};

export function TalentEdgeCard({
  insight, loading, periodDays, onRefresh,
}: {
  insight: TalentEdge | null;
  loading: boolean;
  periodDays: number;
  onRefresh: () => void;
}) {
  return (
    <div className="md:col-span-3 bg-ink text-cream rounded-3xl p-8 fade-up relative overflow-hidden">
      <div aria-hidden className="absolute -right-12 -top-12 size-48 rounded-full bg-accent-red/10 blur-3xl" />

      <div className="flex items-start justify-between mb-6 gap-4 relative">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cream/60 mb-2 flex items-center gap-2">
            <Sparkles className="size-3 text-accent-red" />
            Talent Edge · powered by PERX AI
          </div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-cream/40">Last {periodDays} days</div>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex items-center gap-2 bg-cream/10 hover:bg-cream/15 text-cream px-4 py-2 rounded-full font-semibold text-xs disabled:opacity-40 shrink-0 transition-colors"
        >
          <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Reading the room…" : "Refresh"}
        </button>
      </div>

      {loading && !insight ? (
        <div className="space-y-3 animate-pulse">
          <div className="h-6 rounded bg-cream/10 w-3/4" />
          <div className="h-6 rounded bg-cream/10 w-2/3" />
          <div className="h-16 rounded-2xl bg-cream/5 mt-6" />
          <div className="h-16 rounded-2xl bg-cream/5" />
        </div>
      ) : insight ? (
        <>
          <blockquote className="relative pl-6 mb-7">
            <span aria-hidden className="absolute -left-1 -top-3 font-serif text-6xl leading-none text-accent-red/80">"</span>
            <p className="font-serif text-2xl md:text-[28px] leading-snug tracking-tight">
              {insight.headline}
            </p>
          </blockquote>

          {insight.recommendations.length > 0 && (
            <ul className="space-y-2">
              {insight.recommendations.map((rec, i) => (
                <li key={i} className="flex items-start gap-4 hairline border-cream/10 bg-cream/5 rounded-2xl px-4 py-3">
                  <div className="size-9 rounded-full bg-cream/10 grid place-items-center text-lg shrink-0">
                    {CATEGORY_ICONS[rec.category]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cream/50">
                      {CATEGORY_LABELS[rec.category]}
                    </div>
                    <div className="font-medium text-sm mt-0.5">{rec.action}</div>
                    <div className="text-xs text-cream/60 mt-0.5">{rec.rationale}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <p className="text-sm text-cream/60">Tap Refresh to read this period in plain English.</p>
      )}
    </div>
  );
}