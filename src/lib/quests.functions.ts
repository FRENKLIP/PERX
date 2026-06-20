import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const CompanyInput = z.object({ companyId: z.string().uuid() });
const ClaimInput = z.object({ companyId: z.string().uuid(), slug: z.string().min(1) });

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

export const recomputeQuests = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CompanyInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertEmployerAdmin(supabase, userId, data.companyId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: defs }, { data: employees }, { data: approved }, { data: company }] = await Promise.all([
      supabase.from("quest_definitions").select("*").order("sort_order"),
      supabase.from("profiles").select("id").eq("employer_company_id", data.companyId),
      supabase.from("requests").select("id").eq("employer_company_id", data.companyId).eq("status", "approved"),
      supabaseAdmin.from("companies")
        .select("policy_max_request_all, policy_allowed_categories, policy_auto_approve_below_all")
        .eq("id", data.companyId)
        .maybeSingle(),
    ]);

    const empCount = (employees ?? []).length;
    const apprCount = (approved ?? []).length;
    const policyConfigured =
      !!(company?.policy_max_request_all ||
        (company?.policy_allowed_categories && company.policy_allowed_categories.length > 0) ||
        company?.policy_auto_approve_below_all);

    function metricValue(metric: string) {
      if (metric === "employees_onboarded") return empCount;
      if (metric === "requests_approved") return apprCount;
      if (metric === "policy_configured") return policyConfigured ? 1 : 0;
      return 0;
    }

    const { data: existing } = await supabase
      .from("company_quests")
      .select("*")
      .eq("company_id", data.companyId);
    const byMine = new Map((existing ?? []).map((r: any) => [r.quest_slug, r]));

    for (const d of defs ?? []) {
      const progress = Math.min(metricValue(d.metric), d.target);
      const completed = progress >= d.target;
      const row = byMine.get(d.slug);
      if (!row) {
        await supabase.from("company_quests").insert({
          company_id: data.companyId,
          quest_slug: d.slug,
          progress,
          completed_at: completed ? new Date().toISOString() : null,
        });
      } else if (row.progress !== progress || (!!row.completed_at) !== completed) {
        await supabase.from("company_quests").update({
          progress,
          completed_at: completed ? (row.completed_at ?? new Date().toISOString()) : null,
        }).eq("id", row.id);
      }
    }
    return { ok: true };
  });

export const claimQuest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ClaimInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertEmployerAdmin(supabase, userId, data.companyId);

    const [{ data: def }, { data: row }] = await Promise.all([
      supabase.from("quest_definitions").select("points, target").eq("slug", data.slug).maybeSingle(),
      supabase.from("company_quests").select("*").eq("company_id", data.companyId).eq("quest_slug", data.slug).maybeSingle(),
    ]);
    if (!def) throw new Error("Unknown quest");
    if (!row) throw new Error("Quest not started");
    if (row.claimed_at) throw new Error("Already claimed");
    if ((row.progress ?? 0) < def.target) throw new Error("Quest not complete yet");

    const { error: claimErr } = await supabase
      .from("company_quests")
      .update({ claimed_at: new Date().toISOString() })
      .eq("id", row.id)
      .is("claimed_at", null);
    if (claimErr) throw new Error(claimErr.message);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: company, error: cErr } = await supabaseAdmin
      .from("companies").select("discount_points").eq("id", data.companyId).maybeSingle();
    if (cErr) throw new Error(cErr.message);
    const newPoints = (company?.discount_points ?? 0) + def.points;
    const { error: upErr } = await supabaseAdmin
      .from("companies").update({ discount_points: newPoints }).eq("id", data.companyId);
    if (upErr) throw new Error(upErr.message);

    return { ok: true, points: newPoints, awarded: def.points };
  });