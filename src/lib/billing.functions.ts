import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const PLAN_PRICES = {
  starter: { monthly: 0, yearly: 0, seats: 10, label: "Starter" },
  growth: { monthly: 49900, yearly: 499000, seats: 50, label: "Growth" },
  enterprise: { monthly: 199000, yearly: 1990000, seats: 9999, label: "Enterprise" },
} as const;

const ChangePlanInput = z.object({
  companyId: z.string().uuid(),
  plan: z.enum(["starter", "growth", "enterprise"]),
  period: z.enum(["monthly", "yearly"]),
  applyPoints: z.number().int().nonnegative().optional().default(0),
});

async function assertEmployerAdmin(supabase: any, userId: string, companyId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("company_id", companyId)
    .eq("role", "employer_admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Not authorized for this company");
}

export const changePlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ChangePlanInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertEmployerAdmin(supabase, userId, data.companyId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const base = PLAN_PRICES[data.plan][data.period];
    const { data: company, error: cErr } = await supabaseAdmin
      .from("companies").select("discount_points").eq("id", data.companyId).maybeSingle();
    if (cErr) throw new Error(cErr.message);

    const available = company?.discount_points ?? 0;
    const maxDiscount = Math.floor(base * 0.5);
    const apply = Math.min(data.applyPoints ?? 0, available, maxDiscount);
    const amount = Math.max(0, base - apply);

    const renewsAt = new Date();
    if (data.period === "monthly") renewsAt.setMonth(renewsAt.getMonth() + 1);
    else renewsAt.setFullYear(renewsAt.getFullYear() + 1);

    const { error: planErr } = await supabaseAdmin.from("companies").update({
      plan: data.plan,
      plan_period: data.period,
      plan_renews_at: renewsAt.toISOString(),
      plan_seats: PLAN_PRICES[data.plan].seats,
      discount_points: available - apply,
    }).eq("id", data.companyId);
    if (planErr) throw new Error(planErr.message);

    if (base > 0) {
      const { error: invErr } = await supabase.from("company_invoices").insert({
        company_id: data.companyId,
        plan: data.plan,
        plan_period: data.period,
        amount_all: amount,
        discount_points_applied: apply,
        status: "paid",
        period_start: new Date().toISOString(),
        period_end: renewsAt.toISOString(),
      });
      if (invErr) throw new Error(invErr.message);
    }
    return { ok: true, amount, applied: apply };
  });