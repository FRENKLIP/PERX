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

function calculatePlanCharge(plan: keyof typeof PLAN_PRICES, period: "monthly" | "yearly", applyPoints: number) {
  const base = PLAN_PRICES[plan][period];
  const applied = Math.min(Math.max(applyPoints, 0), Math.floor(base * 0.5));
  return { amount: Math.max(0, base - applied), applied };
}

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
    const { data: rows, error } = await supabase.rpc("change_company_plan" as any, {
      p_company_id: data.companyId,
      p_plan: data.plan,
      p_period: data.period,
      p_apply_points: data.applyPoints ?? 0,
    });
    if (error) {
      const missingRpc =
        error.message.includes("change_company_plan") &&
        (error.message.includes("schema cache") || error.message.includes("Could not find the function"));
      if (!missingRpc) throw new Error(error.message);

      const fallback = calculatePlanCharge(data.plan, data.period, data.applyPoints ?? 0);
      return { ok: true, amount: fallback.amount, applied: fallback.applied, demo: true };
    }

    const result = Array.isArray(rows) ? rows[0] : rows;
    return {
      ok: Boolean(result?.ok),
      amount: Number(result?.amount ?? 0),
      applied: Number(result?.applied ?? 0),
      demo: false,
    };
  });
