import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatAll, useLocale } from "@/lib/i18n";
import { Plus, Map as MapIcon, LayoutGrid } from "lucide-react";
import { lazy, Suspense, useMemo, useState } from "react";
import { toast } from "sonner";
import { FavoriteButton } from "@/components/FavoriteButton";

const TiranaMap = lazy(() => import("@/components/TiranaMap").then((m) => ({ default: m.TiranaMap })));

export const Route = createFileRoute("/_authenticated/marketplace")({
  head: () => ({ meta: [{ title: "Marketplace — PERX" }] }),
  beforeLoad: async () => {
    const { requireRole } = await import("@/lib/roles");
    await requireRole("employee");
  },
  component: Marketplace,
});

function Marketplace() {
  const { t, locale } = useLocale();
  const qc = useQueryClient();
  const [cat, setCat] = useState<string | null>(null);
  const [view, setView] = useState<"list" | "map">("list");
  const [neighborhood, setNeighborhood] = useState<string | null>(null);
  const [maxPrice, setMaxPrice] = useState<number>(25000);

  const { data } = useQuery({
    queryKey: ["marketplace", cat],
    queryFn: async () => {
      const [{ data: cats }, q] = await Promise.all([
        supabase.from("categories").select("*").order("sort_order"),
        supabase.from("offers").select("*, companies:provider_company_id(name,city,address,neighborhood,lat,lng)").eq("is_active", true).order("created_at", { ascending: false }),
      ]);
      let offers = q.data ?? [];
      if (cat) offers = offers.filter((o) => o.category_slug === cat);
      return { cats: cats ?? [], offers };
    },
  });

  const neighborhoods = useMemo(() => {
    const set = new Set<string>();
    (data?.offers ?? []).forEach((o: any) => { if (o.companies?.neighborhood) set.add(o.companies.neighborhood); });
    return Array.from(set).sort();
  }, [data]);

  const filtered = useMemo(() => {
    return (data?.offers ?? []).filter((o: any) =>
      (!neighborhood || o.companies?.neighborhood === neighborhood) &&
      o.price_all <= maxPrice
    );
  }, [data, neighborhood, maxPrice]);

  async function add(offerId: string) {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase.from("cart_items").upsert({ user_id: u.user.id, offer_id: offerId, qty: 1 }, { onConflict: "user_id,offer_id" });
    if (error) toast.error(error.message);
    else { toast.success("Added"); qc.invalidateQueries({ queryKey: ["app-context"] }); }
  }

  return (
    <div className="max-w-7xl mx-auto px-6 pt-10">
      <div className="flex items-end justify-between mb-8 fade-up">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-bone-soft mb-2">Marketplace</div>
          <h1 className="font-serif text-5xl tracking-tight">{filtered.length} places to go in Tirana</h1>
        </div>
        <div className="hidden md:flex hairline rounded-full p-1 bg-obsidian">
          <button onClick={() => setView("list")} className={`px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-2 transition-colors ${view==="list" ? "bg-emerald-deep text-bone" : "text-bone-soft"}`}><LayoutGrid className="size-3.5" /> List</button>
          <button onClick={() => setView("map")} className={`px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-2 transition-colors ${view==="map" ? "bg-emerald-deep text-bone" : "text-bone-soft"}`}><MapIcon className="size-3.5" /> Map</button>
        </div>
      </div>

      <div className="grid md:grid-cols-12 gap-8">
        {/* Filter rail */}
        <aside className="md:col-span-3 space-y-6 fade-up">
          <div>
            <h4 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-bone-soft mb-3">Category</h4>
            <div className="flex flex-wrap gap-2">
              <Chip active={cat === null} onClick={() => setCat(null)}>{t("all_categories")}</Chip>
              {(data?.cats ?? []).map((c) => (
                <Chip key={c.slug} active={cat === c.slug} onClick={() => setCat(c.slug)}>
                  {locale === "sq" ? c.name_sq : c.name_en}
                </Chip>
              ))}
            </div>
          </div>
          {neighborhoods.length > 0 && (
            <div>
              <h4 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-bone-soft mb-3">Neighborhood</h4>
              <div className="flex flex-wrap gap-2">
                <Chip active={neighborhood === null} onClick={() => setNeighborhood(null)}>Any</Chip>
                {neighborhoods.map((n) => (
                  <Chip key={n} active={neighborhood === n} onClick={() => setNeighborhood(n)}>{n}</Chip>
                ))}
              </div>
            </div>
          )}
          <div>
            <h4 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-bone-soft mb-3">Max price</h4>
            <input type="range" min={1000} max={25000} step={500} value={maxPrice} onChange={(e) => setMaxPrice(parseInt(e.target.value))} className="w-full accent-accent-red" />
            <div className="text-xs text-bone-soft mt-2">Up to <strong className="text-bone">{formatAll(maxPrice)}</strong></div>
          </div>
          <div className="md:hidden hairline rounded-full p-1 bg-obsidian flex">
            <button onClick={() => setView("list")} className={`flex-1 px-4 py-2 rounded-full text-xs font-semibold ${view==="list" ? "bg-emerald-deep text-bone" : "text-bone-soft"}`}>List</button>
            <button onClick={() => setView("map")} className={`flex-1 px-4 py-2 rounded-full text-xs font-semibold ${view==="map" ? "bg-emerald-deep text-bone" : "text-bone-soft"}`}>Map</button>
          </div>
        </aside>

        {/* Main area */}
        <div className="md:col-span-9">
          {view === "list" ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((o: any) => (
                <article key={o.id} className="group fade-up">
                  <Link to="/offer/$offerId" params={{ offerId: o.id }} className="block">
                    <div className="relative aspect-[4/5] rounded-2xl overflow-hidden hairline mb-3">
                      {o.image_url && <img src={o.image_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" loading="lazy" />}
                      <div className="absolute top-3 right-3">
                        <FavoriteButton offerId={o.id} />
                      </div>
                    </div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gold">{o.category_slug} · {o.companies?.neighborhood ?? o.location}</div>
                    <h3 className="font-serif text-xl leading-tight mt-1 group-hover:text-gold transition-colors">{locale === "sq" && o.title_sq ? o.title_sq : o.title}</h3>
                    <div className="text-xs text-bone-soft mt-1">{o.companies?.name}</div>
                  </Link>
                  <div className="flex items-center justify-between mt-3">
                    <span className="font-semibold">{formatAll(o.price_all)}</span>
                    <button onClick={() => add(o.id)} aria-label="Add to cart" className="size-9 rounded-full hairline grid place-items-center hover:bg-emerald-deep hover:text-bone hover:border-gold/40 transition-colors">
                      <Plus className="size-4" />
                    </button>
                  </div>
                </article>
              ))}
              {filtered.length === 0 && (
                <div className="col-span-full hairline rounded-3xl p-16 text-center text-bone-soft">No offers match your filters.</div>
              )}
            </div>
          ) : (
            <div className="h-[640px] hairline rounded-3xl overflow-hidden">
              <Suspense fallback={<div className="w-full h-full grid place-items-center text-bone-soft">Loading map…</div>}>
                <TiranaMap pins={filtered as any} onAdd={add} />
              </Suspense>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${active ? "bg-emerald-deep text-bone" : "hairline bg-forest hover:bg-obsidian"}`}>
      {children}
    </button>
  );
}