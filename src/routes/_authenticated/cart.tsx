import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatAll, useLocale } from "@/lib/i18n";
import { Trash2, Coins } from "lucide-react";
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
  const [pointsToUse, setPointsToUse] = useState(0);
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
        const { data: coRows, error: policyErr } = await supabase.rpc("get_employee_company_policy", {
          p_company_id: profile.employer_company_id,
        } as any);
        policy = policyErr ? null : Array.isArray(coRows) ? (coRows[0] ?? null) : coRows;
      }
      return { items: items ?? [], profile, userId: u.user.id, policy };
    },
  });

  const total = (data?.items ?? []).reduce((s: number, it: any) => s + (it.offers?.price_all ?? 0) * (it.qty ?? 1), 0);
  const budget = data?.profile?.monthly_budget_all ?? 25000;
  const pointsBalance: number = data?.profile?.discount_points ?? 0;
  const maxPoints = Math.min(pointsBalance, Math.floor(total * 0.5));
  const safePoints = Math.min(pointsToUse, maxPoints);
  const totalAfter = Math.max(0, total - safePoints);
  const employerId = data?.profile?.employer_company_id;
  const policy = data?.policy;
  const maxAmt: number | null = policy?.policy_max_request_all ?? null;
  const allowed: string[] | null = policy?.policy_allowed_categories ?? null;
  const autoBelow: number | null = policy?.policy_auto_approve_below_all ?? null;
  const overCap = !!(maxAmt && total > maxAmt);
  const disallowedItems = allowed && allowed.length > 0
    ? (data?.items ?? []).filter((it: any) => it.offers && !allowed.includes(it.offers.category_slug))
    : [];
  const willAutoApprove = !!(autoBelow && autoBelow > 0 && total > 0 && total <= autoBelow);
  const blocked = overCap || disallowedItems.length > 0;

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
      const result = await submitFn({ data: { note, packageName, pointsToUse: safePoints } });
      qc.invalidateQueries();
      if (result.autoApproved) {
        toast.success("Auto-approved · payment routed");
        navigate({ to: "/redeem/$requestId", params: { requestId: result.requestId } });
      } else {
        toast.success("Sent to your employer for approval");
        navigate({ to: "/_authenticated/requests" });
      }
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
              <div key={it.id} className={`flex items-center hairline bg-white rounded-2xl p-3 gap-4 fade-up ${allowed && allowed.length > 0 && !allowed.includes(it.offers?.category_slug) ? "ring-1 ring-accent-red/40" : ""}`}>
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
                  {allowed && allowed.length > 0 && !allowed.includes(it.offers?.category_slug) && (
                    <div className="text-[10px] mt-1 inline-block bg-accent-red/10 text-accent-red px-2 py-0.5 rounded-full font-semibold">Not allowed by your employer</div>
                  )}
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
              <WalletRing spent={totalAfter} budget={budget} size={180} />
            </div>
            <div className="text-center mb-6">
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-soft">This request</div>
              <div className="font-serif text-4xl mt-1">{formatAll(totalAfter)}</div>
              {safePoints > 0 && (
                <div className="text-xs text-sage mt-1">−{formatAll(safePoints)} with {safePoints} pts</div>
              )}
            </div>
            {(data?.items ?? []).length > 0 && (
              <>
                {pointsBalance > 0 && total > 0 && (
                  <div className="bg-paper rounded-2xl p-4 mb-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        <Coins className="size-4 text-accent-red" />
                        Use points
                      </div>
                      <div className="text-xs text-ink-soft tabular-nums">{safePoints} / {maxPoints}</div>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={maxPoints}
                      step={50}
                      value={safePoints}
                      onChange={(e) => setPointsToUse(parseInt(e.target.value, 10))}
                      className="w-full accent-ink"
                    />
                    <div className="flex items-center justify-between text-[10px] text-ink-soft mt-1">
                      <span>Balance: {pointsBalance} pts</span>
                      <button type="button" onClick={() => setPointsToUse(maxPoints)} className="font-semibold text-ink hover:text-accent-red">Use max</button>
                    </div>
                  </div>
                )}
                <input value={packageName} onChange={(e) => setPackageName(e.target.value)} placeholder="Name this package (optional)" className="w-full bg-paper rounded-xl px-4 py-3 text-sm mb-3 outline-none placeholder:text-ink-soft/60" />
                <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note to your employer (optional)" className="w-full bg-paper rounded-xl px-4 py-3 text-sm mb-4 outline-none placeholder:text-ink-soft/60" rows={2} />
                {overCap && (
                  <div className="text-xs text-accent-red bg-accent-red/10 rounded-xl px-3 py-2 mb-3">
                    Exceeds employer cap of {formatAll(maxAmt!)} per request.
                  </div>
                )}
                {disallowedItems.length > 0 && (
                  <div className="text-xs text-accent-red bg-accent-red/10 rounded-xl px-3 py-2 mb-3">
                    Remove {disallowedItems.length} item{disallowedItems.length === 1 ? "" : "s"} not allowed by your employer.
                  </div>
                )}
                {willAutoApprove && !blocked && (
                  <div className="text-xs text-sage bg-sage/10 rounded-xl px-3 py-2 mb-3">
                    Under {formatAll(autoBelow!)} — will auto-approve.
                  </div>
                )}
                <button onClick={submit} disabled={submitting || totalAfter > budget || blocked} className="w-full bg-ink text-cream rounded-full py-4 font-semibold disabled:opacity-50 hover:bg-accent-red transition-colors">
                  {submitting ? "Sending…" : totalAfter > budget ? "Over budget" : overCap ? "Over employer cap" : disallowedItems.length > 0 ? "Remove blocked items" : willAutoApprove ? "Send · auto-approve" : t("submit_for_approval")}
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
