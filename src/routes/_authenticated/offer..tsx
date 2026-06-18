import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatAll, useLocale } from "@/lib/i18n";
import { ArrowLeft, Plus, Sparkles, MapPin } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/offer/$offerId")({
  head: () => ({ meta: [{ title: "Offer — PERX" }] }),
  component: OfferDetail,
  errorComponent: ({ error }) => (
    <div className="max-w-3xl mx-auto px-6 py-20 text-center">
      <h1 className="font-serif text-3xl">Couldn't load offer</h1>
      <p className="text-ink-soft mt-2">{error.message}</p>
      <Link to="/marketplace" className="inline-block mt-6 text-accent-red font-semibold">← Back to marketplace</Link>
    </div>
  ),
  notFoundComponent: () => (
    <div className="max-w-3xl mx-auto px-6 py-20 text-center">
      <h1 className="font-serif text-3xl">Offer not found</h1>
      <Link to="/marketplace" className="inline-block mt-6 text-accent-red font-semibold">← Back to marketplace</Link>
    </div>
  ),
});

function OfferDetail() {
  const { offerId } = Route.useParams();
  const { locale } = useLocale();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery({
    queryKey: ["offer", offerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("offers")
        .select("*, companies:provider_company_id(name,description,city,neighborhood,address,lat,lng,hero_image_url,logo_url)")
        .eq("id", offerId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  async function add() {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase
      .from("cart_items")
      .upsert({ user_id: u.user.id, offer_id: offerId, qty: 1 }, { onConflict: "user_id,offer_id" });
    if (error) toast.error(error.message);
    else { toast.success("Added to cart"); qc.invalidateQueries({ queryKey: ["app-context"] }); }
  }

  if (isLoading) {
    return <div className="max-w-7xl mx-auto px-6 py-20 text-ink-soft">Loading…</div>;
  }
  if (error || !data) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-20 text-center">
        <h1 className="font-serif text-3xl">Offer not found</h1>
        <Link to="/marketplace" className="inline-block mt-6 text-accent-red font-semibold">← Back to marketplace</Link>
      </div>
    );
  }

  const o: any = data;
  const title = locale === "sq" && o.title_sq ? o.title_sq : o.title;
  const description = locale === "sq" && o.description_sq ? o.description_sq : o.description;
  const company = o.companies;
  const mapUrl = company?.lat != null && company?.lng != null
    ? `https://www.openstreetmap.org/?mlat=${company.lat}&mlon=${company.lng}#map=16/${company.lat}/${company.lng}`
    : null;

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 fade-up">
      <Link to="/marketplace" className="inline-flex items-center gap-2 text-sm text-ink-soft hover:text-ink mb-8">
        <ArrowLeft className="size-4" /> Back to marketplace
      </Link>

      <div className="grid lg:grid-cols-12 gap-10">
        {/* Hero image */}
        <div className="lg:col-span-7">
          <div className="aspect-[4/3] rounded-3xl overflow-hidden hairline">
            {o.image_url
              ? <img src={o.image_url} alt={title} className="w-full h-full object-cover" />
              : <div className="w-full h-full bg-paper" />}
          </div>
          {o.tags?.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-5">
              {o.tags.map((t: string) => (
                <span key={t} className="text-[10px] font-bold uppercase tracking-[0.18em] hairline px-3 py-1.5 rounded-full bg-white text-ink-soft">
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Sticky info card */}
        <aside className="lg:col-span-5">
          <div className="lg:sticky lg:top-10">
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent-red mb-3">
              {o.category_slug}{company?.neighborhood ? ` · ${company.neighborhood}` : o.location ? ` · ${o.location}` : ""}
              {o.is_seasonal && " · Seasonal"}
            </div>
            <h1 className="font-serif text-4xl md:text-5xl tracking-tight leading-[1.05]">{title}</h1>
            {company && (
              <div className="mt-3 text-sm text-ink-soft">
                by <span className="font-semibold text-ink">{company.name}</span>
              </div>
            )}

            <div className="hairline rounded-3xl p-6 mt-8 bg-white">
              <div className="flex items-baseline justify-between">
                <span className="font-serif text-4xl">{formatAll(o.price_all)}</span>
                <span className="text-xs text-ink-soft uppercase tracking-widest">per redemption</span>
              </div>
              <button onClick={add} className="mt-5 w-full bg-ink text-cream rounded-2xl py-4 font-bold hover:bg-accent-red transition-colors inline-flex items-center justify-center gap-2">
                <Plus className="size-4" /> Add to cart
              </button>
              <button onClick={() => navigate({ to: "/concierge" })} className="mt-2 w-full hairline bg-cream rounded-2xl py-3.5 font-semibold text-sm hover:border-ink/30 transition-colors inline-flex items-center justify-center gap-2">
                <Sparkles className="size-4" /> Ask the concierge
              </button>
              <p className="text-[11px] text-ink-soft mt-3 leading-relaxed">
                Funded by your employer wallet. Pay nothing at checkout — your provider gets paid directly when the request is approved.
              </p>
            </div>
          </div>
        </aside>
      </div>

      {/* About */}
      <section className="mt-16 grid lg:grid-cols-12 gap-10">
        <div className="lg:col-span-7">
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-soft mb-3">About this offer</div>
          <p className="font-serif text-2xl leading-snug text-pretty">{description}</p>
        </div>
        {company && (
          <div className="lg:col-span-5">
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-soft mb-3">About the provider</div>
            <div className="hairline rounded-3xl p-6 bg-white">
              <h3 className="font-serif text-2xl">{company.name}</h3>
              {company.description && <p className="text-sm text-ink-soft mt-2 leading-relaxed">{company.description}</p>}
              {(company.address || company.city) && (
                <div className="mt-4 flex items-start gap-2 text-sm text-ink-soft">
                  <MapPin className="size-4 mt-0.5 shrink-0" />
                  <span>{[company.address, company.neighborhood, company.city].filter(Boolean).join(", ")}</span>
                </div>
              )}
              {mapUrl && (
                <a href={mapUrl} target="_blank" rel="noreferrer" className="text-xs font-semibold text-accent-red hover:underline mt-3 inline-block">
                  Open in maps →
                </a>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
