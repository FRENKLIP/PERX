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
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="font-display text-4xl tracking-tight">Provider studio</h1>
          <p className="text-foreground/60 mt-1">Your offers, incoming orders, and revenue.</p>
        </div>
        <button onClick={() => setShowNew((v) => !v)} className="bg-ink text-cream px-5 py-3 rounded-xl font-bold text-sm flex items-center gap-2"><Plus className="size-4" /> New offer</button>
      </div>

      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <Stat label="Live offers" value={data?.offers.length.toString() ?? "0"} />
        <Stat label="Paid orders" value={paid.length.toString()} />
        <Stat label="Revenue" value={formatAll(revenue)} />
      </div>

      {showNew && (
        <form onSubmit={createOffer} className="bg-white border border-border-soft rounded-3xl p-6 mb-8 grid sm:grid-cols-2 gap-4">
          <Field label="Title" value={form.title} onChange={(v) => setForm({ ...form, title: v })} />
          <Field label="Price (ALL)" value={form.price} onChange={(v) => setForm({ ...form, price: v })} type="number" />
          <Field label="Location" value={form.location} onChange={(v) => setForm({ ...form, location: v })} />
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-widest text-foreground/50 mb-2 block">Category</span>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full bg-cream border border-border-soft rounded-2xl px-4 py-3 outline-none">
              {(data?.cats ?? []).map((c) => <option key={c.slug} value={c.slug}>{c.name_en}</option>)}
            </select>
          </label>
          <label className="block sm:col-span-2">
            <span className="text-xs font-bold uppercase tracking-widest text-foreground/50 mb-2 block">Description</span>
            <textarea required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full bg-cream border border-border-soft rounded-2xl px-4 py-3 outline-none" rows={3} />
          </label>
          <button type="submit" className="sm:col-span-2 bg-accent-red text-white py-3 rounded-xl font-bold">Publish</button>
        </form>
      )}

      <h2 className="font-display text-2xl mb-4">Incoming orders</h2>
      <div className="space-y-2 mb-10">
        {(data?.items ?? []).slice(0, 10).map((it: any) => (
          <div key={it.id} className="bg-white border border-border-soft rounded-2xl p-4 flex items-center gap-4">
            <div className="flex-1">
              <div className="font-semibold text-sm">{it.offer_title}</div>
              <div className="text-xs text-foreground/50">{it.requests?.status} · {new Date(it.requests?.created_at).toLocaleDateString()}</div>
            </div>
            {it.redemption_code && <span className="text-xs font-mono bg-cream px-2 py-1 rounded">{it.redemption_code}</span>}
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${it.payment_status === "simulated_paid" ? "bg-emerald-100 text-emerald-700" : "bg-accent-orange/15 text-accent-orange"}`}>
              {it.payment_status === "simulated_paid" ? "Paid" : "Pending"}
            </span>
            <span className="font-bold">{formatAll(it.price_all)}</span>
          </div>
        ))}
        {(data?.items ?? []).length === 0 && <div className="bg-white border border-border-soft rounded-3xl p-12 text-center text-foreground/60">No orders yet.</div>}
      </div>

      <h2 className="font-display text-2xl mb-4">Your offers</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(data?.offers ?? []).map((o) => (
          <div key={o.id} className="bg-white border border-border-soft rounded-3xl p-5">
            <div className="text-xs font-bold text-accent-red uppercase mb-2">{o.category_slug}</div>
            <h3 className="font-display text-lg mb-1">{o.title}</h3>
            <p className="text-xs text-foreground/50 mb-3 line-clamp-2">{o.description}</p>
            <div className="flex justify-between items-center"><span className="font-display font-extrabold">{formatAll(o.price_all)}</span><span className="text-xs text-foreground/50">{o.location}</span></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border border-border-soft rounded-3xl p-6">
      <div className="text-xs font-bold uppercase tracking-widest text-foreground/40 mb-2">{label}</div>
      <div className="font-display text-3xl font-extrabold">{value}</div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-widest text-foreground/50 mb-2 block">{label}</span>
      <input required type={type} value={value} onChange={(e) => onChange(e.target.value)} className="w-full bg-cream border border-border-soft rounded-2xl px-4 py-3 outline-none" />
    </label>
  );
}