import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatAll, useLocale } from "@/lib/i18n";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

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
  const [cat, setCat] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ["marketplace", cat],
    queryFn: async () => {
      const [{ data: cats }, q] = await Promise.all([
        supabase.from("categories").select("*").order("sort_order"),
        supabase.from("offers").select("*, companies:provider_company_id(name,city)").eq("is_active", true).order("created_at", { ascending: false }),
      ]);
      let offers = q.data ?? [];
      if (cat) offers = offers.filter((o) => o.category_slug === cat);
      return { cats: cats ?? [], offers };
    },
  });

  async function add(offerId: string) {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase.from("cart_items").upsert({ user_id: u.user.id, offer_id: offerId, qty: 1 }, { onConflict: "user_id,offer_id" });
    if (error) toast.error(error.message); else toast.success("Added");
  }

  return (
    <div className="max-w-7xl mx-auto px-6 pt-10">
      <h1 className="font-display text-4xl tracking-tight mb-6">{t("marketplace")}</h1>
      <div className="flex flex-wrap gap-2 mb-8">
        <Chip active={cat === null} onClick={() => setCat(null)}>{t("all_categories")}</Chip>
        {(data?.cats ?? []).map((c) => (
          <Chip key={c.slug} active={cat === c.slug} onClick={() => setCat(c.slug)}>
            {locale === "sq" ? c.name_sq : c.name_en}
          </Chip>
        ))}
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {(data?.offers ?? []).map((o) => (
          <div key={o.id} className="bento-item bg-white border border-border-soft rounded-3xl overflow-hidden">
            <div className="aspect-[16/10] bg-gradient-to-br from-accent-orange/25 to-accent-red/15 grid place-items-center">
              <span className="text-[10px] font-bold uppercase tracking-widest text-ink/30">{(o as any).companies?.name}</span>
            </div>
            <div className="p-5">
              <div className="flex justify-between mb-1">
                <span className="text-[10px] font-bold text-accent-red uppercase">{o.category_slug}</span>
                <span className="font-display font-extrabold">{formatAll(o.price_all)}</span>
              </div>
              <h3 className="font-display text-lg mb-1">{locale === "sq" && o.title_sq ? o.title_sq : o.title}</h3>
              <p className="text-xs text-foreground/50 mb-4 line-clamp-2">{locale === "sq" && o.description_sq ? o.description_sq : o.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold opacity-60 uppercase">{o.location}</span>
                <button onClick={() => add(o.id)} className="size-9 rounded-full bg-cream border border-border-soft hover:bg-accent-red hover:text-white hover:border-accent-red grid place-items-center">
                  <Plus className="size-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`px-4 py-2 rounded-full text-xs font-bold border ${active ? "bg-ink text-cream border-ink" : "bg-white border-border-soft hover:border-ink/30"}`}>
      {children}
    </button>
  );
}