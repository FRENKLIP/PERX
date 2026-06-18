import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatAll, useLocale } from "@/lib/i18n";
import { ArrowRight, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { WalletRing } from "@/components/WalletRing";
import { ProviderStories } from "@/components/ProviderStories";

export const Route = createFileRoute("/_authenticated/app")({
  head: () => ({ meta: [{ title: "Home — PERX" }] }),
  beforeLoad: async () => {
    const { requireRole } = await import("@/lib/roles");
    await requireRole("employee");
  },
  component: AppHome,
});

function AppHome() {
  const { locale } = useLocale();
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ["app-home"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const [{ data: profile }, { data: editors }, { data: stories }, { data: pending }] = await Promise.all([
        supabase.from("profiles").select("full_name, monthly_budget_all").eq("id", u.user?.id ?? "").maybeSingle(),
        supabase.from("offers").select("*, companies:provider_company_id(name,neighborhood,address)").eq("is_active", true).order("created_at", { ascending: false }).limit(6),
        supabase.from("companies").select("id,name,description,neighborhood,hero_image_url,offers:offers!offers_provider_company_id_fkey(id,title,price_all)").eq("kind","provider").order("name").limit(10),
        supabase.from("requests").select("total_all").eq("employee_id", u.user?.id ?? "").eq("status","pending"),
      ]);
      const spent = (pending ?? []).reduce((s,r) => s + (r.total_all ?? 0), 0);
      return {
        firstName: (profile?.full_name ?? "there").split(" ")[0],
        budget: profile?.monthly_budget_all ?? 25000,
        spent,
        editors: editors ?? [],
        stories: (stories ?? []).filter((s: any) => s.offers?.length),
      };
    },
  });

  const [weekly, setWeekly] = useState<{ theme: string; picks: any[] } | null>(null);
  useEffect(() => {
    const key = `perx_weekly_${new Date().toISOString().slice(0,10)}`;
    const cached = typeof window !== "undefined" ? localStorage.getItem(key) : null;
    if (cached) { try { setWeekly(JSON.parse(cached)); return; } catch {} }
    fetch("/api/weekly-drop").then((r) => r.json()).then((j) => {
      setWeekly(j);
      try { localStorage.setItem(key, JSON.stringify(j)); } catch {}
    }).catch(() => {});
  }, []);

  async function addToCart(offerId: string) {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase.from("cart_items").upsert({ user_id: u.user.id, offer_id: offerId, qty: 1 }, { onConflict: "user_id,offer_id" });
    if (error) toast.error(error.message);
    else { toast.success("Added to cart"); qc.invalidateQueries({ queryKey: ["app-context"] }); }
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? (locale === "sq" ? "Mirëmëngjes" : "Good morning") : hour < 18 ? (locale === "sq" ? "Mirëdita" : "Good afternoon") : (locale === "sq" ? "Mirëmbrëma" : "Good evening");

  return (
    <div className="max-w-6xl mx-auto px-6 pt-10">
      {/* Greeting + wallet */}
      <section className="grid md:grid-cols-12 gap-10 items-center pb-12 fade-up">
        <div className="md:col-span-7">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-soft mb-4">
            {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
          </div>
          <h1 className="font-serif text-5xl md:text-6xl leading-[0.98] tracking-tight text-balance">
            {greeting}, {data?.firstName ?? "Era"}.<br />
            <em className="text-accent-red">What sounds good today?</em>
          </h1>
          <p className="text-ink-soft text-lg mt-6 max-w-md text-pretty">
            Your tax-free wallet refreshes on the 1st. Spend it on something you'd actually want.
          </p>
          <div className="flex gap-3 mt-8">
            <Link to="/concierge" className="inline-flex items-center gap-2 bg-ink text-cream px-6 py-3 rounded-full text-sm font-semibold hover:bg-accent-red transition-colors">
              <Sparkles className="size-4" /> Ask concierge
            </Link>
            <Link to="/marketplace" className="inline-flex items-center gap-2 hairline rounded-full px-6 py-3 text-sm font-semibold hover:bg-paper">
              Browse marketplace <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
        <div className="md:col-span-5 grid place-items-center">
          {data && <WalletRing spent={data.spent} budget={data.budget} />}
        </div>
      </section>

      {/* Provider stories */}
      {data?.stories && data.stories.length > 0 && (
        <section className="py-6 fade-up">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-soft mb-4">Tirana right now</div>
          <ProviderStories stories={data.stories as any} onAdd={addToCart} />
        </section>
      )}

      {/* AI weekly drop */}
      <section className="my-10 fade-up">
        <div className="rounded-3xl bg-ink text-cream p-8 md:p-10 grid md:grid-cols-12 gap-8 items-end">
          <div className="md:col-span-5">
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cream/60 mb-3">PERX AI · Weekly drop</div>
            <h2 className="font-serif text-3xl md:text-4xl leading-tight">
              {weekly?.theme ?? "Loading this week's pick..."}
            </h2>
          </div>
          <div className="md:col-span-7 grid sm:grid-cols-3 gap-3">
            {(weekly?.picks ?? []).map((o) => (
              <button key={o.id} onClick={() => addToCart(o.id)} className="text-left bg-cream/5 hover:bg-cream/10 transition-colors rounded-2xl overflow-hidden group">
                <div className="aspect-[4/3] overflow-hidden">
                  {o.image_url && <img src={o.image_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />}
                </div>
                <div className="p-3">
                  <div className="text-[10px] uppercase tracking-widest text-cream/50">{o.category_slug}</div>
                  <div className="font-serif text-lg leading-tight mt-1 line-clamp-2">{o.title}</div>
                  <div className="text-xs mt-2 text-cream/70">{formatAll(o.price_all)} · {o.companies?.neighborhood ?? o.location}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Editor's picks */}
      <section className="my-14 fade-up">
        <div className="flex items-end justify-between mb-6">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-soft mb-1">Editor's picks</div>
            <h2 className="font-serif text-3xl">Fresh from Tirana</h2>
          </div>
          <Link to="/marketplace" className="text-sm font-semibold text-accent-red hover:underline">All offers →</Link>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {(data?.editors ?? []).map((o: any) => (
            <article key={o.id} className="group">
              <div className="aspect-[4/5] rounded-2xl overflow-hidden hairline mb-3">
                {o.image_url && <img src={o.image_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />}
              </div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-accent-red">{o.category_slug} · {o.companies?.neighborhood ?? o.location}</div>
              <h3 className="font-serif text-2xl leading-tight mt-1">{locale === "sq" && o.title_sq ? o.title_sq : o.title}</h3>
              <p className="text-sm text-ink-soft mt-1 line-clamp-2">{locale === "sq" && o.description_sq ? o.description_sq : o.description}</p>
              <div className="flex items-center justify-between mt-3">
                <span className="font-semibold">{formatAll(o.price_all)}</span>
                <button onClick={() => addToCart(o.id)} className="size-9 rounded-full hairline grid place-items-center hover:bg-ink hover:text-cream hover:border-ink transition-colors">
                  <Plus className="size-4" />
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}