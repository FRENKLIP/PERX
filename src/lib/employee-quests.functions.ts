import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const ClaimInput = z.object({ slug: z.string().min(1) });

async function computeMetrics(supabase: any, userId: string) {
  const [{ data: profile }, { data: approved }, { data: redeemed }, { data: favs }, { data: reviews }] = await Promise.all([
    supabase.from("profiles").select("full_name, avatar_url").eq("id", userId).maybeSingle(),
    supabase.from("requests").select("id").eq("employee_id", userId).eq("status", "approved"),
    supabase.from("requests").select("id").eq("employee_id", userId).not("redeemed_at", "is", null),
    supabase.from("favorites").select("id").eq("user_id", userId),
    supabase.from("offer_reviews").select("id").eq("user_id", userId),
  ]);
  return {
    profile_complete: profile?.full_name && profile?.avatar_url ? 1 : 0,
    requests_approved: (approved ?? []).length,
    redeemed_count: (redeemed ?? []).length,
    favorites_count: (favs ?? []).length,
    reviews_count: (reviews ?? []).length,
  } as Record<string, number>;
}

export const recomputeEmployeeQuests = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: defs }, metrics, { data: existing }] = await Promise.all([
      supabase.from("employee_quest_definitions").select("*").order("sort_order"),
      computeMetrics(supabase, userId),
      supabase.from("employee_quests").select("*").eq("user_id", userId),
    ]);
    const byMine = new Map((existing ?? []).map((r: any) => [r.quest_slug, r]));
    for (const d of defs ?? []) {
      const value = metrics[d.metric] ?? 0;
      const progress = Math.min(value, d.target);
      const completed = progress >= d.target;
      const row = byMine.get(d.slug);
      if (!row) {
        await supabase.from("employee_quests").insert({
          user_id: userId,
          quest_slug: d.slug,
          progress,
          completed_at: completed ? new Date().toISOString() : null,
        });
      } else if (row.progress !== progress || (!!row.completed_at) !== completed) {
        await supabase.from("employee_quests").update({
          progress,
          completed_at: completed ? (row.completed_at ?? new Date().toISOString()) : null,
        }).eq("id", row.id);
      }
    }
    return { ok: true };
  });

export const claimEmployeeQuest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ClaimInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const [{ data: def }, { data: row }, { data: profile }] = await Promise.all([
      supabase.from("employee_quest_definitions").select("points, target").eq("slug", data.slug).maybeSingle(),
      supabase.from("employee_quests").select("*").eq("user_id", userId).eq("quest_slug", data.slug).maybeSingle(),
      supabase.from("profiles").select("discount_points").eq("id", userId).maybeSingle(),
    ]);
    if (!def) throw new Error("Unknown quest");
    if (!row) throw new Error("Quest not started yet");
    if (row.claimed_at) throw new Error("Already claimed");
    if ((row.progress ?? 0) < def.target) throw new Error("Quest not complete yet");

    const { error: claimErr } = await supabase
      .from("employee_quests")
      .update({ claimed_at: new Date().toISOString() })
      .eq("id", row.id)
      .is("claimed_at", null);
    if (claimErr) throw new Error(claimErr.message);

    const newBalance = (profile?.discount_points ?? 0) + def.points;
    const { error: pErr } = await supabase
      .from("profiles")
      .update({ discount_points: newBalance })
      .eq("id", userId);
    if (pErr) throw new Error(pErr.message);

    await supabase.from("points_ledger").insert({
      user_id: userId,
      delta: def.points,
      reason: "quest_claim",
      ref_id: null,
    });

    return { ok: true, awarded: def.points, balance: newBalance };
  });