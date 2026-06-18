import { useMemo, useState } from "react";
import { TiranaMap } from "@/components/TiranaMap";

type Offer = {
  id: string;
  title: string;
  price_all: number;
  category_slug: string;
  image_url?: string | null;
  location?: string | null;
  companies?: { name?: string | null; address?: string | null; neighborhood?: string | null; lat?: number | null; lng?: number | null } | null;
};

export function ProviderMapPanel({ offers, onAdd }: { offers: Offer[]; onAdd: (id: string) => void }) {
  const neighborhoods = useMemo(() => {
    const set = new Set<string>();
    offers.forEach((o) => {
      const n = o.companies?.neighborhood ?? o.location;
      if (n) set.add(n);
    });
    return ["All", ...Array.from(set)];
  }, [offers]);
  const [active, setActive] = useState<string>("All");

  const filtered = useMemo(
    () => offers.filter((o) => active === "All" || (o.companies?.neighborhood ?? o.location) === active),
    [offers, active]
  );

  return (
    <section className="rounded-[2rem] hairline overflow-hidden bg-cream">
      <div className="grid md:grid-cols-12">
        <div className="md:col-span-4 p-6 md:p-8 border-r border-border-soft">
          <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-ink-soft mb-2">Tirana, on the map</div>
          <h2 className="font-serif text-3xl md:text-4xl leading-tight">Find perks by neighborhood.</h2>
          <p className="text-ink-soft text-sm mt-3">Click a pin to see the offer. Filter by area to plan a route.</p>
          <div className="flex flex-wrap gap-1.5 mt-5">
            {neighborhoods.map((n) => (
              <button
                key={n}
                onClick={() => setActive(n)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  active === n ? "bg-ink text-cream border-ink" : "bg-paper text-ink border-border-soft hover:border-ink"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <div className="text-[11px] text-ink-soft mt-5">{filtered.length} pin{filtered.length === 1 ? "" : "s"}</div>
        </div>
        <div className="md:col-span-8 h-[440px]">
          <TiranaMap pins={filtered as any} onAdd={onAdd} />
        </div>
      </div>
    </section>
  );
}