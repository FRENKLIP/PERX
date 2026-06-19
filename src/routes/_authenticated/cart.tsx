import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatAll, useLocale } from "@/lib/i18n";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { WalletRing } from "@/components/WalletRing";
import { submitCartRequest } from "@/lib/cart.functions";

export const Route = createFileRoute("/_authenticated/cart")({
  head: () => ({ meta: [{ title: "Cart — PERX" }] }),
  beforeLoad: async () => {
    const { requireRole } = await import("@/lib/roles");
    await requireRole("employee");
  },
  component: Cart,
});

function Cart() {
  const { t, locale } = useLocale();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [note, setNote] = useState("");
  const [packageName, setPackageName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submitFn = useServerFn(submitCartRequest);

  const { data } = useQuery({
    queryKey: ["cart"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const [{ data: items }, { data: profile }] = await Promise.all([
        supabase.from("cart_items").select("id, qty, chosen_provider_id, chosen:chosen_provider_id(name), offers(id,title,title_sq,price_all,category_slug,provider_company_id,image_url,companies:provider_company_id(name))").eq("user_id", u.user.id),
        supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle(),
      ]);
      let policy: any = null;
      if (profile?.employer_company_id) {
        const { data: co } = await supabase
          .from("companies")
          .select("policy_max_request_all, policy_allowed_categories, policy_auto_approve_below_all")
          .eq("id", profile.employer_company_id)
          .maybeSingle();
        policy = co;
      }
      return { items: items ?? [], profile, userId: u.user.id, policy };
    },
  });

  const total = (data?.items ?? []).reduce((s: number, it: any) => s + (it.offers?.price_all ?? 0) * (it.qty ?? 1), 0);
  const budget = data?.profile?.monthly_budget_all ?? 25000;
  const employerId = data?.profile?.employer_company_id;

  async function remove(id: string) {
    await supabase.from("cart_items").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["cart"] });
    qc.invalidateQueries({ queryKey: ["app-context"] });
  }

  async function submit() {
    if (!data?.userId || !employerId) { toast.error("No employer linked to your profile"); return; }
    if ((data.items ?? []).length === 0) return;
    setSubmitting(true);
    try {
      const { data: req, error } = await supabase.from("requests").insert({
        employee_id: data.userId,
        employer_company_id: employerId,
        total_all: total,
        note,
        ai_package_name: packageName || null,
      }).select().single();
      if (error) throw error;
      // Resolve share % per line from offer_providers
      const offerIds = (data.items as any[]).map((it) => it.offers.id);
      const { data: opRows } = offerIds.length
        ? await supabase.from("offer_providers").select("offer_id, provider_company_id, share_pct, is_owner, accepted_at").in("offer_id", offerIds)
        : { data: [] as any[] };
      const rows = (data.items as any[]).map((it) => {
        const all = (opRows ?? []).filter((r) => r.offer_id === it.offers.id);
        const fulfillingId = it.chosen_provider_id ?? it.offers.provider_company_id;
        const row = all.find((r) => r.provider_company_id === fulfillingId);
        const share = row?.share_pct ?? 100;
        return {
          request_id: req.id,
          offer_id: it.offers.id,
          provider_company_id: fulfillingId,
          offer_title: it.offers.title,
          price_all: it.offers.price_all,
          qty: it.qty,
          share_pct_snapshot: share,
        };
      });
      const { error: e2 } = await supabase.from("request_items").insert(rows);
      if (e2) throw e2;
      await supabase.from("cart_items").delete().eq("user_id", data.userId);
      qc.invalidateQueries();
      toast.success("Sent to your employer for approval");
      navigate({ to: "/_authenticated/requests" });
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-6 pt-10">
      <div className="fade-up mb-10">
        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-soft mb-2">Your selection</div>
        <h1 className="font-serif text-5xl tracking-tight">Ready when you are.</h1>
      </div>

      <div className="grid md:grid-cols-12 gap-10">
        <div className="md:col-span-7 space-y-3">
          {(data?.items ?? []).length === 0 ? (
            <div className="hairline rounded-3xl p-16 text-center">
              <p className="font-serif text-2xl mb-3">Empty cart, empty plans.</p>
              <p className="text-ink-soft text-sm mb-6">Browse the marketplace or let the concierge help.</p>
              <Link to="/marketplace" className="inline-block bg-ink text-cream rounded-full px-6 py-3 text-sm font-semibold hover:bg-accent-red">Browse marketplace</Link>
            </div>
          ) : (
            (data?.items ?? []).map((it: any) => (
              <div key={it.id} className="flex items-center hairline bg-white rounded-2xl p-3 gap-4 fade-up">
                <div className="size-16 rounded-xl overflow-hidden shrink-0 bg-paper">
                  {it.offers?.image_url && <img src={it.offers.image_url} alt="" className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-semibold text-accent-red uppercase tracking-[0.18em]">{it.offers?.category_slug}</div>
                  <div className="font-serif text-lg leading-tight truncate">{locale === "sq" && it.offers?.title_sq ? it.offers.title_sq : it.offers?.title}</div>
                  <div className="text-xs text-ink-soft">
                    {it.chosen?.name ?? it.offers?.companies?.name}
                    {it.chosen && it.chosen.name !== it.offers?.companies?.name && <span className="ml-1 text-accent-red font-semibold">· redeem here</span>}
                  </div>
                </div>
                <div className="font-semibold">{formatAll(it.offers?.price_all ?? 0)}</div>
                <button onClick={() => remove(it.id)} className="size-9 rounded-full hover:bg-paper grid place-items-center text-ink-soft hover:text-accent-red">
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))
          )}
        </div>

        <aside className="md:col-span-5">
          <div className="md:sticky md:top-24 hairline bg-white rounded-3xl p-8 fade-up">
            <div className="flex justify-center mb-6">
              <WalletRing spent={total} budget={budget} size={180} />
            </div>
            <div className="text-center mb-6">
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-soft">This request</div>
              <div className="font-serif text-4xl mt-1">{formatAll(total)}</div>
            </div>
            {(data?.items ?? []).length > 0 && (
              <>
                <input value={packageName} onChange={(e) => setPackageName(e.target.value)} placeholder="Name this package (optional)" className="w-full bg-paper rounded-xl px-4 py-3 text-sm mb-3 outline-none placeholder:text-ink-soft/60" />
                <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note to your employer (optional)" className="w-full bg-paper rounded-xl px-4 py-3 text-sm mb-4 outline-none placeholder:text-ink-soft/60" rows={2} />
                <button onClick={submit} disabled={submitting || total > budget} className="w-full bg-ink text-cream rounded-full py-4 font-semibold disabled:opacity-50 hover:bg-accent-red transition-colors">
                  {submitting ? "Sending…" : total > budget ? "Over budget" : t("submit_for_approval")}
                </button>
                <p className="text-xs text-ink-soft text-center mt-4">Your employer approves and payment routes directly to providers.</p>
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}