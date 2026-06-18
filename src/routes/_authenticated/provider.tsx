import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatAll } from "@/lib/i18n";
import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/provider")({
  head: () => ({ meta: [{ title: "Provider — PERX" }] }),
  beforeLoad: async () => {
    const { requireRole } = await import("@/lib/roles");
    await requireRole(["provider_admin"]);
  },
  component: ProviderDashboard,
});

function ProviderDashboard() {
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", price: "5000", category: "wellness", location: "Tirana" });

  const { data } = useQuery({
    queryKey: ["provider-data"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data: roles } = await supabase.from("user_roles").select("company_id").eq("user_id", u.user.id).eq("role", "provider_admin");
      const companyIds = (roles ?? []).map((r) => r.company_id).filter(Boolean) as string[];
      if (companyIds.length === 0) return null;
      const [{ data: offers }, { data: items }, { data: cats }] = await Promise.all([
        supabase.from("offers").select("*").in("provider_company_id", companyIds).order("created_at", { ascending: false }),
        supabase.from("request_items").select("*, requests(status, decided_at, created_at)").in("provider_company_id", companyIds).order("id", { ascending: false }),
        supabase.from("categories").select("*"),
      ]);
      return { offers: offers ?? [], items: items ?? [], companyIds, cats: cats ?? [] };
    },
  });

  const paid = (data?.items ?? []).filter((i) => i.payment_status === "simulated_paid");
  const pending = (data?.items ?? []).filter((i) => i.payment_status !== "simulated_paid");
  const revenue = paid.reduce((s, i) => s + i.price_all, 0);

  async function createOffer(e: React.FormEvent) {
    e.preventDefault();
    if (!data?.companyIds[0]) return;
    const { error } = await supabase.from("offers").insert({
      provider_company_id: data.companyIds[0],
      title: form.title,
      description: form.description,
      price_all: parseInt(form.price, 10),
      category_slug: form.category,
      location: form.location,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Offer published");
      setShowNew(false);
      setForm({ title: "", description: "", price: "5000", category: "wellness", location: "Tirana" });
      qc.invalidateQueries({ queryKey: ["provider-data"] });
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-6 pt-10">
      <div className="flex justify-between items-end mb-10 fade-up gap-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-soft mb-2">Provider studio</div>
          <h1 className="font-serif text-5xl tracking-tight">Your offers, your orders.</h1>
        </div>
        <button onClick={() => setShowNew((v) => !v)} className="bg-ink text-cream px-5 py-3 rounded-full font-semibold text-sm flex items-center gap-2 hover:bg-accent-red transition-colors shrink-0">
          <Plus className="size-4" /> New offer
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-px bg-border-soft hairline rounded-3xl overflow-hidden mb-10">
        <Stat label="Live offers" value={data?.offers.length.toString() ?? "0"} />
        <Stat label="Paid orders" value={paid.length.toString()} />
        <Stat label="Revenue" value={formatAll(revenue)} />
      </div>

      {showNew && (
        <form onSubmit={createOffer} className="hairline bg-white rounded-3xl p-6 mb-10 grid sm:grid-cols-2 gap-4 fade-up">
          <Field label="Title" value={form.title} onChange={(v) => setForm({ ...form, title: v })} />
          <Field label="Price (ALL)" value={form.price} onChange={(v) => setForm({ ...form, price: v })} type="number" />
          <Field label="Location" value={form.location} onChange={(v) => setForm({ ...form, location: v })} />
          <label className="block">
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-soft mb-2 block">Category</span>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full bg-paper rounded-2xl px-4 py-3 outline-none">
              {(data?.cats ?? []).map((c) => <option key={c.slug} value={c.slug}>{c.name_en}</option>)}
            </select>
          </label>
          <label className="block sm:col-span-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-soft mb-2 block">Description</span>
            <textarea required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full bg-paper rounded-2xl px-4 py-3 outline-none" rows={3} />
          </label>
          <button type="submit" className="sm:col-span-2 bg-ink text-cream py-3 rounded-full font-semibold hover:bg-accent-red transition-colors">Publish</button>
        </form>
      )}

      <h2 className="font-serif text-3xl mb-4">Incoming orders</h2>
      <div className="space-y-2 mb-10">
        {(data?.items ?? []).slice(0, 10).map((it: any) => (
          <div key={it.id} className="hairline bg-white rounded-2xl p-4 flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm truncate">{it.offer_title}</div>
              <div className="text-xs text-ink-soft">{it.requests?.status} · {new Date(it.requests?.created_at).toLocaleDateString()}</div>
            </div>
            {it.redemption_code && <span className="text-xs font-mono bg-paper px-2 py-1 rounded">{it.redemption_code}</span>}
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${it.payment_status === "simulated_paid" ? "bg-sage/15 text-sage" : "bg-accent-orange/15 text-accent-orange"}`}>
              {it.payment_status === "simulated_paid" ? "Paid" : "Pending"}
            </span>
            <span className="font-semibold">{formatAll(it.price_all)}</span>
          </div>
        ))}
        {(data?.items ?? []).length === 0 && <div className="hairline rounded-3xl p-12 text-center text-ink-soft">No orders yet.</div>}
      </div>

      <h2 className="font-serif text-3xl mb-4">Your offers</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {(data?.offers ?? []).map((o: any) => (
          <article key={o.id} className="hairline bg-white rounded-3xl overflow-hidden">
            {o.image_url && <div className="aspect-[4/3] overflow-hidden"><img src={o.image_url} alt="" className="w-full h-full object-cover" loading="lazy" /></div>}
            <div className="p-5">
              <div className="text-[10px] font-semibold text-accent-red uppercase tracking-[0.18em] mb-1">{o.category_slug}</div>
              <h3 className="font-serif text-xl leading-tight mb-1">{o.title}</h3>
              <p className="text-xs text-ink-soft mb-3 line-clamp-2">{o.description}</p>
              <div className="flex justify-between items-center"><span className="font-semibold">{formatAll(o.price_all)}</span><span className="text-xs text-ink-soft">{o.location}</span></div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white p-6">
      <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-soft mb-2">{label}</div>
      <div className="font-serif text-4xl">{value}</div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="block">
      <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-soft mb-2 block">{label}</span>
      <input required type={type} value={value} onChange={(e) => onChange(e.target.value)} className="w-full bg-paper rounded-2xl px-4 py-3 outline-none" />
    </label>
  );
}