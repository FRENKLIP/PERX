import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { generateProviderInsights } from "@/lib/provider-ai.functions";
import { Sparkles, RefreshCw, TrendingUp, DollarSign, Lightbulb } from "lucide-react";

export function AIInsightsCard() {
  const generate = useServerFn(generateProviderInsights);
  const { data, isFetching, refetch, error } = useQuery({
    queryKey: ["provider-ai-insights"],
    queryFn: async () => generate({ data: {} as any }),
    staleTime: 10 * 60 * 1000,
    retry: false,
  });

  return (
    <div className="hairline bg-white rounded-3xl p-6 fade-up mb-10">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-full bg-ink text-cream grid place-items-center">
            <Sparkles className="size-4" />
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-soft">AI insights · last 30 days</div>
            <h3 className="font-serif text-2xl mt-0.5">What's working for you</h3>
          </div>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-1.5 text-xs font-semibold rounded-full px-3 py-2 hairline hover:bg-paper disabled:opacity-50"
        >
          <RefreshCw className={`size-3.5 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {isFetching && !data && (
        <div className="grid sm:grid-cols-3 gap-4">
          {[0,1,2].map(i => <div key={i} className="h-32 bg-paper rounded-2xl animate-pulse" />)}
        </div>
      )}
      {error && !isFetching && (
        <div className="text-sm text-accent-red bg-accent-red/10 rounded-xl p-3">
          {(error as any).message ?? "AI insights unavailable"}
        </div>
      )}
      {data && (
        <>
          <p className="text-sm text-ink leading-relaxed mb-5">{data.summary}</p>
          <div className="grid sm:grid-cols-3 gap-4">
            <Section icon={TrendingUp} label="Top categories" items={data.topCategories} />
            <Section icon={DollarSign} label="Pricing moves" items={data.pricingSuggestions} />
            <Section icon={Lightbulb} label="Opportunities" items={data.opportunities} />
          </div>
        </>
      )}
    </div>
  );
}

function Section({ icon: Icon, label, items }: { icon: any; label: string; items: string[] }) {
  return (
    <div className="bg-paper rounded-2xl p-4">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-soft mb-2">
        <Icon className="size-3.5" /> {label}
      </div>
      <ul className="space-y-1.5 text-sm">
        {items.length === 0 ? (
          <li className="text-ink-soft text-xs italic">No suggestions yet</li>
        ) : items.map((s, i) => (
          <li key={i} className="leading-snug">{s}</li>
        ))}
      </ul>
    </div>
  );
}