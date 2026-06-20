import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { changePlan, PLAN_PRICES } from "@/lib/billing.functions";
import { formatAll } from "@/lib/i18n";
import { Check, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

const PLANS = [
  {
    id: "starter" as const,
    tagline: "For small teams piloting PERX",
    features: ["Up to 10 employees", "Basic policy controls", "Community support", "Standard marketplace access"],
  },
  {
    id: "growth" as const,
    tagline: "Scale benefits across the company",
    features: ["Up to 50 employees", "Advanced policy + auto-approve", "Talent Edge analytics", "Priority support"],
  },
  {
    id: "enterprise" as const,
    tagline: "For larger organizations",
    features: ["Unlimited employees", "SSO + custom policy", "Dedicated CSM", "Custom integrations"],
  },
];

export function BillingTab({ companyId }: { companyId: string }) {
  const qc = useQueryClient();
  const change = useServerFn(changePlan);
  const [period, setPeriod] = useState<"monthly" | "yearly">("monthly");
  const [pending, setPending] = useState<string | null>(null);
  const [applyPoints, setApplyPoints] = useState(0);

  const { data } = useQuery({
    queryKey: ["company-billing", companyId],
    queryFn: async () => {
      const [{ data: coRows }, { data: invoices }] = await Promise.all([
        supabase.rpc("get_company_billing", { p_company_id: companyId } as any),
        supabase.from("company_invoices")
          .select("*").eq("company_id", companyId)
          .order("created_at", { ascending: false }),
      ]);
      const company = Array.isArray(coRows) ? (coRows[0] ?? null) : coRows;
      return { company, invoices: invoices ?? [] };
    },
    enabled: !!companyId,
  });

  const currentPlan = data?.company?.plan ?? "starter";
  const points = data?.company?.discount_points ?? 0;

  async function onSwitch(planId: "starter" | "growth" | "enterprise") {
    if (!confirm(`Switch to ${PLAN_PRICES[planId].label} (${period})?`)) return;
    setPending(planId);
    try {
      const res = await change({ data: { companyId, plan: planId, period, applyPoints } });
      toast.success(res.amount === 0
        ? `Activated ${PLAN_PRICES[planId].label}`
        : `Charged ${formatAll(res.amount)}${res.applied ? ` · ${res.applied} pts applied` : ""}`);
      setApplyPoints(0);
      qc.invalidateQueries({ queryKey: ["company-billing", companyId] });
      qc.invalidateQueries({ queryKey: ["company-quests", companyId] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="space-y-10">
      <div className="fade-up">
        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-soft mb-2">Employer console</div>
        <h1 className="font-serif text-5xl tracking-tight">Plans & billing.</h1>
        <p className="text-ink-soft mt-3 max-w-xl">
          Pick the plan that fits your team. Currently on <span className="font-semibold text-ink">{PLAN_PRICES[currentPlan as keyof typeof PLAN_PRICES].label}</span>
          {data?.company?.plan_renews_at ? ` · renews ${new Date(data.company.plan_renews_at).toLocaleDateString()}` : ""}.
        </p>
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap fade-up">
        <div className="inline-flex p-1 rounded-full bg-paper hairline">
          {(["monthly", "yearly"] as const).map((p) => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${period === p ? "bg-ink text-cream" : "text-ink-soft"}`}>
              {p === "monthly" ? "Monthly" : "Yearly · save ~17%"}
            </button>
          ))}
        </div>
        {points > 0 && (
          <div className="hairline rounded-full px-4 py-2 flex items-center gap-3 text-sm bg-white">
            <Sparkles className="size-4 text-accent-red" />
            <span>Apply discount points:</span>
            <input
              type="number" min={0} max={points} value={applyPoints}
              onChange={(e) => setApplyPoints(Math.max(0, Math.min(points, parseInt(e.target.value || "0", 10))))}
              className="w-24 bg-paper rounded-full px-3 py-1 text-sm outline-none"
            />
            <span className="text-ink-soft">/ {points} available</span>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {PLANS.map((p) => {
          const price = PLAN_PRICES[p.id][period];
          const isCurrent = currentPlan === p.id;
          return (
            <div key={p.id}
              className={`relative rounded-3xl p-6 fade-up ${isCurrent ? "bg-ink text-cream" : "bg-white hairline"}`}>
              {isCurrent && (
                <div className="absolute top-4 right-4 text-[10px] font-bold uppercase tracking-[0.15em] bg-cream/15 text-cream px-2 py-1 rounded-full">
                  Current
                </div>
              )}
              <div className="font-serif text-3xl">{PLAN_PRICES[p.id].label}</div>
              <p className={`text-sm mt-1 ${isCurrent ? "text-cream/70" : "text-ink-soft"}`}>{p.tagline}</p>
              <div className="mt-5">
                {price === 0 ? (
                  <div className="font-serif text-4xl">Free</div>
                ) : (
                  <div>
                    <span className="font-serif text-4xl">{formatAll(price)}</span>
                    <span className={`text-sm ml-1 ${isCurrent ? "text-cream/70" : "text-ink-soft"}`}>/{period === "monthly" ? "mo" : "yr"}</span>
                  </div>
                )}
              </div>
              <ul className="mt-5 space-y-2 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className={`size-4 mt-0.5 shrink-0 ${isCurrent ? "text-sage" : "text-sage"}`} />
                    <span className={isCurrent ? "text-cream/90" : "text-ink"}>{f}</span>
                  </li>
                ))}
              </ul>
              <button
                disabled={pending === p.id || isCurrent}
                onClick={() => onSwitch(p.id)}
                className={`mt-6 w-full py-3 rounded-full font-semibold text-sm transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-60 ${
                  isCurrent
                    ? "bg-cream/15 text-cream cursor-default"
                    : "bg-ink text-cream hover:bg-accent-red"
                }`}
              >
                {pending === p.id && <Loader2 className="size-4 animate-spin" />}
                {isCurrent ? "Current plan" : `Switch to ${PLAN_PRICES[p.id].label}`}
              </button>
            </div>
          );
        })}
      </div>

      <div>
        <h2 className="font-serif text-3xl mb-4">Invoice history</h2>
        {(data?.invoices ?? []).length === 0 ? (
          <div className="hairline rounded-3xl p-12 text-center text-ink-soft">No invoices yet.</div>
        ) : (
          <div className="hairline rounded-3xl bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead className="text-[10px] uppercase tracking-[0.15em] text-ink-soft">
                <tr className="border-b border-border-soft">
                  <th className="text-left p-4">Date</th>
                  <th className="text-left p-4">Plan</th>
                  <th className="text-right p-4">Discount</th>
                  <th className="text-right p-4">Amount</th>
                  <th className="text-right p-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {data!.invoices.map((inv: any) => (
                  <tr key={inv.id} className="border-b border-border-soft last:border-0">
                    <td className="p-4">{new Date(inv.created_at).toLocaleDateString()}</td>
                    <td className="p-4 capitalize">{inv.plan} · {inv.plan_period}</td>
                    <td className="p-4 text-right text-ink-soft">{inv.discount_points_applied ? `-${formatAll(inv.discount_points_applied)}` : "—"}</td>
                    <td className="p-4 text-right font-semibold">{formatAll(inv.amount_all)}</td>
                    <td className="p-4 text-right">
                      <span className="text-[10px] font-bold uppercase tracking-[0.15em] bg-sage/15 text-sage px-2 py-1 rounded-full">{inv.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}