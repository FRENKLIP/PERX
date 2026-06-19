import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatAll } from "@/lib/i18n";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Power, PowerOff, Copy, Upload, X, Loader2 } from "lucide-react";
import { StatTile } from "@/components/StatTile";
import { TrendArea, TopBars, CategoryDonut, PeriodSwitcher, trendBuckets } from "@/components/DashboardCharts";

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
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [period, setPeriod] = useState<7 | 30 | 90>(30);

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
        supabase.from("request_items").select("*, requests(status, decided_at, created_at, employer_company_id)").in("provider_company_id", companyIds).order("id", { ascending: false }),
        supabase.from("categories").select("*"),
      ]);
      return { offers: offers ?? [], items: items ?? [], companyIds, cats: cats ?? [] };
    },
  });

  const paid = (data?.items ?? []).filter((i) => i.payment_status === "simulated_paid");
  const pending = (data?.items ?? []).filter((i) => i.payment_status !== "simulated_paid");
  const revenue = paid.reduce((s, i) => s + i.price_all, 0);
  const pendingRevenue = pending.reduce((s, i) => s + i.price_all, 0);
  const totalOrders = (data?.items ?? []).length;
  const conversion = totalOrders ? Math.round((paid.length / totalOrders) * 100) : 0;
  const avgOrder = paid.length ? Math.round(revenue / paid.length) : 0;
  const activeOffers = (data?.offers ?? []).filter((o: any) => o.is_active !== false).length;

  const sinceMs = period * 24 * 60 * 60 * 1000;
  const cutoff = Date.now() - sinceMs;

  const trend = useMemo(() => trendBuckets(
    paid
      .filter((it: any) => {
        const d = it.requests?.decided_at ?? it.requests?.created_at;
        return d && new Date(d).getTime() >= cutoff;
      })
      .map((it: any) => ({ date: it.requests?.decided_at ?? it.requests?.created_at, value: it.price_all })),
    period,
  ), [paid, period, cutoff]);

  const topOffers = useMemo(() => {
    const map = new Map<string, { value: number; count: number }>();
    paid.forEach((it: any) => {
      const key = it.offer_title ?? "Untitled";
      const cur = map.get(key) ?? { value: 0, count: 0 };
      cur.value += it.price_all;
      cur.count += it.qty ?? 1;
      map.set(key, cur);
    });
    return Array.from(map.entries())
      .map(([name, v]) => ({ name: name.length > 22 ? name.slice(0, 22) + "…" : name, value: v.value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [paid]);

  const statusMix = [
    { name: "Paid", value: paid.length },
    { name: "Pending", value: pending.length },
  ].filter((s) => s.value > 0);

  const distinctEmployers = useMemo(() => {
    const set = new Set<string>();
    (data?.items ?? []).forEach((it: any) => { if (it.requests?.employer_company_id) set.add(it.requests.employer_company_id); });
    return set.size;
  }, [data]);

  const recentCodes = useMemo(() => paid.filter((i: any) => i.redemption_code).slice(0, 6), [paid]);

  async function toggleActive(id: string, current: boolean) {
    const { error } = await supabase.from("offers").update({ is_active: !current }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success(!current ? "Offer activated" : "Offer paused"); qc.invalidateQueries({ queryKey: ["provider-data"] }); }
  }

  function copyCode(code: string) {
    navigator.clipboard?.writeText(code).then(() => toast.success("Copied"));
  }

  async function createOffer(e: React.FormEvent) {
    e.preventDefault();
    if (!data?.companyIds[0]) return;
    setUploading(true);
    let image_url: string | null = null;
    if (imageFile) {
      const ext = imageFile.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const path = `${data.companyIds[0]}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("offer-images").upload(path, imageFile, {
        cacheControl: "3600",
        upsert: false,
        contentType: imageFile.type,
      });
      if (upErr) {
        setUploading(false);
        toast.error(upErr.message);
        return;
      }
      image_url = supabase.storage.from("offer-images").getPublicUrl(path).data.publicUrl;
    }
    const { error } = await supabase.from("offers").insert({
      provider_company_id: data.companyIds[0],
      title: form.title,
      description: form.description,
      price_all: parseInt(form.price, 10),
      category_slug: form.category,
      location: form.location,
      image_url,
    });
    setUploading(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Offer published");
      setShowNew(false);
      setForm({ title: "", description: "", price: "5000", category: "wellness", location: "Tirana" });
      setImageFile(null);
      setImagePreview(null);
      qc.invalidateQueries({ queryKey: ["provider-data"] });
    }
  }

  function handleImagePick(file: File | null) {
    if (!file) { setImageFile(null); setImagePreview(null); return; }
    if (!file.type.startsWith("image/")) { toast.error("Please pick an image file"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Max 5MB"); return; }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  return (
    <div className="max-w-6xl mx-auto px-6 pt-10">
      <div className="flex justify-between items-end mb-10 fade-up gap-4 flex-wrap">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-soft mb-2">Provider studio</div>
          <h1 className="font-serif text-5xl tracking-tight">Your offers, your orders.</h1>
        </div>
        <div className="flex items-center gap-3">
          <PeriodSwitcher value={period} onChange={setPeriod} />
          <button onClick={() => setShowNew((v) => !v)} className="bg-ink text-cream px-5 py-3 rounded-full font-semibold text-sm flex items-center gap-2 hover:bg-accent-red transition-colors shrink-0">
            <Plus className="size-4" /> New offer
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-px bg-border-soft hairline rounded-3xl overflow-hidden mb-10 fade-up">
        <StatTile label="Live offers" value={`${activeOffers}`} hint={`${(data?.offers ?? []).length} total`} accent="ink" />
        <StatTile label="Paid orders" value={paid.length.toString()} hint={`${pending.length} pending`} accent="sage" />
        <StatTile label="Revenue" value={formatAll(revenue)} hint={`paid out`} accent="red" />
        <StatTile label="Pending revenue" value={formatAll(pendingRevenue)} hint="awaiting approval" accent="orange" />
        <StatTile label="Conversion" value={`${conversion}%`} hint={`${paid.length} / ${totalOrders} orders`} accent="ink" />
        <StatTile label="Avg order" value={formatAll(avgOrder)} hint={paid.length ? "per paid order" : "no sales yet"} accent="ink" />
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-12 gap-6 mb-10">
        <div className="lg:col-span-7 hairline bg-white rounded-3xl p-6 fade-up">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-soft">Revenue trend</div>
              <h3 className="font-serif text-2xl mt-1">Last {period} days</h3>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-soft">Paid</div>
              <div className="font-serif text-2xl">{formatAll(trend.reduce((s, t) => s + t.value, 0))}</div>
            </div>
          </div>
          <TrendArea data={trend} color="#c5503a" />
        </div>
        <div className="lg:col-span-5 hairline bg-white rounded-3xl p-6 fade-up">
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-soft mb-1">Order status</div>
          <h3 className="font-serif text-2xl mb-4">Paid vs pending</h3>
          {statusMix.length > 0 ? <CategoryDonut data={statusMix} /> : <div className="h-[220px] grid place-items-center text-sm text-ink-soft">No orders yet.</div>}
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-6 mb-10">
        <div className="lg:col-span-7 hairline bg-white rounded-3xl p-6 fade-up">
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-soft mb-1">Top offers</div>
          <h3 className="font-serif text-2xl mb-4">Your bestsellers</h3>
          <TopBars data={topOffers} color="#c5503a" />
        </div>
        <div className="lg:col-span-5 grid grid-cols-2 gap-px bg-border-soft hairline rounded-3xl overflow-hidden fade-up self-start">
          <div className="bg-white p-6">
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-soft mb-2">Employers reached</div>
            <div className="font-serif text-5xl">{distinctEmployers}</div>
            <div className="text-xs text-ink-soft mt-2">Companies sending orders to you</div>
          </div>
          <div className="bg-white p-6">
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-soft mb-2">Total bookings</div>
            <div className="font-serif text-5xl">{totalOrders}</div>
            <div className="text-xs text-ink-soft mt-2">Across all your offers</div>
          </div>
          <div className="bg-white p-6 col-span-2 border-t border-border-soft">
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-soft mb-3">Recent redemption codes</div>
            {recentCodes.length === 0 ? (
              <div className="text-sm text-ink-soft py-2">No paid orders yet.</div>
            ) : (
              <ul className="grid sm:grid-cols-2 gap-2">
                {recentCodes.map((it: any) => (
                  <li key={it.id} className="flex items-center gap-2 bg-paper rounded-xl px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-xs truncate">{it.offer_title}</div>
                      <div className="font-mono text-[11px] text-ink-soft">{it.redemption_code}</div>
                    </div>
                    <button onClick={() => copyCode(it.redemption_code)} className="size-7 grid place-items-center rounded-full hover:bg-white" title="Copy">
                      <Copy className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
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
          <div className="sm:col-span-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-soft mb-2 block">Cover image</span>
            {imagePreview ? (
              <div className="relative rounded-2xl overflow-hidden hairline group">
                <img src={imagePreview} alt="" className="w-full aspect-[16/9] object-cover" />
                <button
                  type="button"
                  onClick={() => handleImagePick(null)}
                  className="absolute top-3 right-3 size-9 grid place-items-center rounded-full bg-ink/80 text-cream hover:bg-accent-red transition-colors"
                  aria-label="Remove image"
                >
                  <X className="size-4" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-2 aspect-[16/9] sm:aspect-[21/9] bg-paper hairline rounded-2xl cursor-pointer hover:bg-paper/70 transition-colors">
                <Upload className="size-5 text-ink-soft" />
                <span className="text-sm text-ink-soft">Drop or click to upload (max 5MB)</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleImagePick(e.target.files?.[0] ?? null)}
                />
              </label>
            )}
          </div>
          <button
            type="submit"
            disabled={uploading}
            className="sm:col-span-2 bg-ink text-cream py-3 rounded-full font-semibold hover:bg-accent-red transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {uploading && <Loader2 className="size-4 animate-spin" />}
            {uploading ? "Publishing…" : "Publish"}
          </button>
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
          <article key={o.id} className={`hairline bg-white rounded-3xl overflow-hidden ${o.is_active === false ? "opacity-60" : ""}`}>
            {o.image_url && (
              <div className="relative aspect-[4/3] overflow-hidden">
                <img src={o.image_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                <span className={`absolute top-3 left-3 text-[10px] font-bold uppercase tracking-[0.18em] px-2.5 py-1 rounded-full ${o.is_active === false ? "bg-ink/80 text-cream" : "bg-sage/90 text-cream"}`}>
                  {o.is_active === false ? "Paused" : "Live"}
                </span>
              </div>
            )}
            <div className="p-5">
              <div className="text-[10px] font-semibold text-accent-red uppercase tracking-[0.18em] mb-1">{o.category_slug}</div>
              <h3 className="font-serif text-xl leading-tight mb-1">{o.title}</h3>
              <p className="text-xs text-ink-soft mb-3 line-clamp-2">{o.description}</p>
              <div className="flex justify-between items-center">
                <span className="font-semibold">{formatAll(o.price_all)}</span>
                <button
                  onClick={() => toggleActive(o.id, o.is_active !== false)}
                  className="text-[11px] font-semibold flex items-center gap-1.5 text-ink-soft hover:text-ink"
                  title={o.is_active === false ? "Activate" : "Pause"}
                >
                  {o.is_active === false ? <><Power className="size-3.5" /> Activate</> : <><PowerOff className="size-3.5" /> Pause</>}
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
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