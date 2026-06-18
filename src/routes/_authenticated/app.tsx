import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatAll, useLocale } from "@/lib/i18n";
import { Plus, ArrowRight, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/app")({
  head: () => ({ meta: [{ title: "Home — Perka" }] }),
  beforeLoad: async () => {
    const { requireRole } = await import("@/lib/roles");
    await requireRole("employee");
  },
  component: AppHome,
});

function AppHome() {
  const { t, locale } = useLocale();
  const navigate = useNavigate();

  const { data } = useQuery({
    queryKey: ["app-home"],
    queryFn: async () => {
      const [{ data: cats }, { data: offers }, { data: seasonal }, { data: u }] = await Promise.all([
        supabase.from("categories").select("*").order("sort_order"),
        supabase.from("offers").select("*, companies:provider_company_id(name,city)").eq("is_active", true).eq("is_seasonal", false).limit(6),
        supabase.from("offers").select("*, companies:provider_company_id(name)").eq("is_seasonal", true).eq("is_active", true).limit(4),
        supabase.auth.getUser(),
      ]);
      const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", u.user?.id ?? "").maybeSingle();
      return { cats: cats ?? [], offers: offers ?? [], seasonal: seasonal ?? [], firstName: (profile?.full_name ?? "there").split(" ")[0] };
    },
  });

  async function addToCart(offerId: string) {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase.from("cart_items").upsert({ user_id: u.user.id, offer_id: offerId, qty: 1 }, { onConflict: "user_id,offer_id" });
    if (error) toast.error(error.message); else toast.success("Added to cart");
  }

  const hour = new Date().getHours();
  const greeting = hour < 18 ? (locale === "sq" ? "Mirëmëngjes" : "Good morning") : (locale === "sq" ? "Mirëmbrëma" : "Good evening");

  return (
    <div className="max-w-7xl mx-auto px-6 pt-8">
      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-12 gap-4 auto-rows-[140px]">
        {/* AI Concierge tile */}
        <Link to="/_authenticated/concierge" className="bento-item col-span-1 md:col-span-4 lg:col-span-7 row-span-3 bg-white border border-border-soft rounded-[32px] p-8 flex flex-col justify-between [animation-delay:100ms] hover:border-accent-red transition-colors">
          <div>
            <h1 className="font-display text-4xl lg:text-5xl tracking-tight leading-[1.1] text-balance mb-4">
              {greeting}, {data?.firstName ?? "Era"}.<br/><span className="text-accent-red italic">{locale === "sq" ? "Çfarë të duhet sot?" : "What do you need today?"}</span>
            </h1>
            <p className="text-foreground/60 max-w-md text-pretty">Your benefit concierge is ready to help you spend your tax-free wallet on things you'll love.</p>
          </div>
          <div className="relative pointer-events-none">
            <div className="w-full bg-cream border border-border-soft rounded-2xl py-5 px-6 text-sm font-medium text-foreground/40 pr-16">
              {t("ask_perka")}
            </div>
            <div className="absolute right-3 top-3 size-11 bg-ink rounded-xl flex items-center justify-center">
              <Sparkles className="size-5 text-accent-orange" />
            </div>
          </div>
        </Link>

        {/* Smart Package */}
        <SmartPackageTile />

        {/* Seasonal Drops strip */}
        <div className="bento-item col-span-1 md:col-span-4 lg:col-span-12 row-span-1 bg-accent-red rounded-full flex items-center px-8 overflow-hidden [animation-delay:300ms]">
          <div className="flex gap-12 whitespace-nowrap items-center animate-marquee">
            {[...(data?.seasonal ?? []), ...(data?.seasonal ?? [])].map((o, i) => (
              <span key={i} className="text-white font-display uppercase italic font-extrabold text-base tracking-widest flex items-center gap-4">
                {o.title} <span className="size-1.5 bg-white rounded-full" /> {formatAll(o.price_all)} <span className="size-1.5 bg-white rounded-full" />
              </span>
            ))}
          </div>
        </div>

        {/* Category chips */}
        <div className="bento-item col-span-1 md:col-span-2 lg:col-span-4 row-span-2 bg-white border border-border-soft rounded-[32px] p-6 flex flex-wrap gap-2 content-start [animation-delay:400ms]">
          <h3 className="w-full text-[10px] font-bold uppercase tracking-widest text-foreground/40 mb-2">Categories</h3>
          {(data?.cats ?? []).map((c) => (
            <Link key={c.slug} to="/_authenticated/marketplace" search={{ cat: c.slug } as any}
              className="px-4 py-2 bg-cream border border-border-soft rounded-xl text-xs font-bold hover:border-ink/30">
              {locale === "sq" ? c.name_sq : c.name_en}
            </Link>
          ))}
        </div>

        {/* Featured offers */}
        {(data?.offers ?? []).slice(0, 2).map((o, i) => (
          <div key={o.id} className={`bento-item col-span-1 md:col-span-2 lg:col-span-4 row-span-4 bg-white border border-border-soft rounded-[32px] overflow-hidden group [animation-delay:${500 + i * 100}ms]`}>
            <div className="w-full aspect-[4/3] bg-gradient-to-br from-accent-orange/30 to-accent-red/20 grid place-items-center">
              <span className="text-[10px] font-bold uppercase tracking-widest text-ink/30">{(o as any).companies?.name}</span>
            </div>
            <div className="p-6">
              <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-bold text-accent-red uppercase tracking-widest">{o.category_slug}</span>
                <span className="font-display font-extrabold text-xl">{formatAll(o.price_all)}</span>
              </div>
              <h3 className="font-display text-xl mb-1">{locale === "sq" && o.title_sq ? o.title_sq : o.title}</h3>
              <p className="text-xs text-foreground/50 mb-4 line-clamp-2">{locale === "sq" && o.description_sq ? o.description_sq : o.description}</p>
              <div className="pt-4 border-t border-border-soft flex justify-between items-center">
                <span className="text-[10px] font-bold opacity-60 uppercase">{o.location}</span>
                <button onClick={() => addToCart(o.id)} className="size-8 rounded-full bg-cream border border-border-soft hover:bg-accent-red hover:text-white hover:border-accent-red grid place-items-center">
                  <Plus className="size-4" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Employer contribution */}
        <div className="bento-item col-span-1 md:col-span-2 lg:col-span-4 row-span-2 bg-ink text-cream rounded-[32px] p-6 flex flex-col justify-between [animation-delay:700ms]">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest opacity-60 mb-1">Employer contribution</h4>
            <p className="text-sm leading-relaxed opacity-90">Your monthly wallet refreshes on the 1st. Approved benefits are paid straight to providers — tax-efficient by design.</p>
          </div>
          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-accent-orange w-3/4" />
          </div>
        </div>
      </div>

      <section className="mt-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-2xl tracking-tight">More to discover</h2>
          <Link to="/_authenticated/marketplace" className="text-sm font-bold text-accent-red flex items-center gap-1">Browse all <ArrowRight className="size-4" /></Link>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {(data?.offers ?? []).slice(2).map((o) => (
            <div key={o.id} className="bg-white border border-border-soft rounded-3xl overflow-hidden">
              <div className="aspect-[4/3] bg-gradient-to-br from-accent-orange/20 to-accent-red/10" />
              <div className="p-5">
                <div className="flex justify-between mb-1">
                  <span className="text-[10px] font-bold text-accent-red uppercase">{o.category_slug}</span>
                  <span className="font-bold text-sm">{formatAll(o.price_all)}</span>
                </div>
                <h4 className="font-display text-lg mb-3">{locale === "sq" && o.title_sq ? o.title_sq : o.title}</h4>
                <button onClick={() => addToCart(o.id)} className="w-full text-xs font-bold bg-cream rounded-xl py-2 hover:bg-ink hover:text-cream transition-colors">{t("add_to_cart")}</button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function SmartPackageTile() {
  const navigate = useNavigate();
  const { data } = useQuery({
    queryKey: ["smart-package-tile"],
    queryFn: async () => {
      // pick 3 offers across categories for the bundle
      const { data: offers } = await supabase.from("offers")
        .select("id,title,price_all,category_slug,companies:provider_company_id(name)")
        .in("category_slug", ["wellness", "food", "learning"]).limit(6);
      const grouped: any[] = [];
      const seen = new Set<string>();
      (offers ?? []).forEach((o) => {
        if (!seen.has(o.category_slug) && grouped.length < 3) { grouped.push(o); seen.add(o.category_slug); }
      });
      const total = grouped.reduce((s, o) => s + o.price_all, 0);
      return { items: grouped, total: Math.round(total * 0.85) };
    },
  });

  async function activate() {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user || !data) return;
    for (const o of data.items) {
      await supabase.from("cart_items").upsert({ user_id: u.user.id, offer_id: o.id, qty: 1 }, { onConflict: "user_id,offer_id" });
    }
    toast.success("Smart package added to cart");
    navigate({ to: "/_authenticated/cart" });
  }

  return (
    <div className="bento-item col-span-1 md:col-span-4 lg:col-span-5 row-span-3 bg-accent-orange text-white rounded-[32px] p-8 flex flex-col justify-between overflow-hidden relative [animation-delay:200ms]">
      <div className="relative z-10">
        <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">AI Recommended</span>
        <h2 className="font-display text-3xl mt-4 leading-tight">The 'Tirana Energy' Pack</h2>
        <p className="mt-2 opacity-90 text-sm">{data?.items.map((i) => (i as any).companies?.name ?? i.title).join(" · ")}</p>
      </div>
      <div className="relative z-10 flex items-end justify-between">
        <div>
          <span className="block text-[10px] opacity-70 uppercase font-bold tracking-widest">Bundle price</span>
          <span className="text-4xl font-display font-extrabold">{data ? formatAll(data.total) : "—"}</span>
        </div>
        <button onClick={activate} className="bg-white text-accent-orange px-6 py-3 rounded-2xl font-bold text-sm hover:scale-105 transition-transform">Get bundle</button>
      </div>
      <div className="absolute -right-10 -bottom-10 size-64 bg-white/10 rounded-full blur-3xl" />
    </div>
  );
}