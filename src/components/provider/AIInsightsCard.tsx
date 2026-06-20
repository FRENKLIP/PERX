import { useState } from "react";
import { Sparkles, RefreshCw, TrendingUp, DollarSign, Lightbulb } from "lucide-react";

const demoInsights = {
  summary:
    "Your strongest demo signal is practical, easy-to-redeem offers in wellness and meals. Keep the offer titles concrete, price entry packages clearly, and use premium bundles where the included value is obvious to employers.",
  topCategories: [
    "Wellness is best for recurring monthly usage",
    "Meals convert well when the package is specific",
    "Travel works best as a limited weekend perk",
  ],
  pricingSuggestions: [
    "Keep everyday perks around 2,500-3,500 ALL",
    "Use 5,000-6,000 ALL for premium weekend packages",
    "Round prices to the nearest 500 ALL for easier approvals",
  ],
  opportunities: [
    "Add one weekday-friendly offer for office teams",
    "Lead descriptions with what is included",
    "Bundle partner experiences for higher perceived value",
  ],
};

export function AIInsightsCard() {
  const [data, setData] = useState(demoInsights);
  const [isFetching, setIsFetching] = useState(false);

  async function refreshDemoInsights() {
    setIsFetching(true);
    await new Promise((resolve) => window.setTimeout(resolve, 650));
    setData({
      summary:
        "The demo trend still favors clear, low-friction benefits. Offers that explain the experience in one sentence, show a rounded ALL price, and feel easy for employers to approve are most likely to perform well.",
      topCategories: [
        "Wellness remains the most repeatable category",
        "Meals help teams spend smaller monthly balances",
        "Learning is a strong add-on for retention",
      ],
      pricingSuggestions: [
        "Test one 3,000 ALL entry offer",
        "Keep premium bundles under 6,000 ALL unless they include multiple services",
        "Use clear package names instead of broad discounts",
      ],
      opportunities: [
        "Create a lunch-and-wellness bundle",
        "Add availability notes to reduce employer questions",
        "Refresh cover images on your highest-value listings",
      ],
    });
    setIsFetching(false);
  }

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
          onClick={refreshDemoInsights}
          disabled={isFetching}
          className="flex items-center gap-1.5 text-xs font-semibold rounded-full px-3 py-2 hairline hover:bg-paper disabled:opacity-50"
        >
          <RefreshCw className={`size-3.5 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

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
