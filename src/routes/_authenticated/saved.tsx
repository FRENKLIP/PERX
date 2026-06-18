import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatAll, useLocale } from "@/lib/i18n";
import { FavoriteButton } from "@/components/FavoriteButton";

export const Route = createFileRoute("/_authenticated/saved")({
  head: () => ({ meta: [{ title: "Saved — PERX" }] }),
  beforeLoad: async () => {
    const { requireRole } = await import("@/lib/roles");
    await requireRole("employee");
  },
  component: Saved,
});

function Saved() {
  const { locale } = useLocale();
  const { data } = useQuery({
    queryKey: ["saved-offers"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return [];
      const { data } = await supabase
        .from("favorites")
        .select("offer_id, created_at, offers:offer_id(id,title,title_sq,image_url,price_all,category_slug,location,companies:provider_company_id(name,neighborhood))")
        .eq("user_id", u.user.id)
        .order("created_at", { ascending: false });
      return (data ?? []).filter((r: any) => r.offers);
    },
  });

  return (
    <div className="max-w-7xl mx-auto px-6 pt-10">
      <div className="fade-up mb-10">
        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-bone-soft mb-2">Saved</div>
        <h1 className="font-serif text-5xl tracking-tight">{(data?.length ?? 0)} kept for later.</h1>
      </div>

      {(data?.length ?? 0) === 0 ? (
        <div className="hairline rounded-3xl p-16 text-center">
          <p className="font-serif text-2xl mb-3">Nothing saved yet.</p>
          <p className="text-bone-soft text-sm mb-6">Tap the heart on any offer to keep it here.</p>
          <Link to="/marketplace" className="inline-block bg-emerald-deep text-bone rounded-full px-6 py-3 text-sm font-semibold hover:bg-gold">Browse marketplace</Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {(data ?? []).map((r: any) => {
            const o = r.offers;
            return (
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
                  <div className="font-semibold mt-2">{formatAll(o.price_all)}</div>
                </Link>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}