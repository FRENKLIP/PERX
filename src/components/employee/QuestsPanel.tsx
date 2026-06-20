import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { recomputeEmployeeQuests, claimEmployeeQuest } from "@/lib/employee-quests.functions";
import { ArrowRight, Check, CheckCircle2, Coins, Gift, Loader2, Sparkles, Target, Trophy } from "lucide-react";
import { toast } from "sonner";

export function QuestsPanel({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const recompute = useServerFn(recomputeEmployeeQuests);
  const claim = useServerFn(claimEmployeeQuest);

  useEffect(() => {
    recompute({ data: {} as any })
      .then(() => qc.invalidateQueries({ queryKey: ["employee-quests", userId] }))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const { data, isLoading } = useQuery({
    queryKey: ["employee-quests", userId],
    queryFn: async () => {
      const [{ data: defs }, { data: rows }, { data: profile }] = await Promise.all([
        supabase.from("employee_quest_definitions").select("*").order("sort_order"),
        supabase.from("employee_quests").select("*").eq("user_id", userId),
        supabase.from("profiles").select("discount_points").eq("id", userId).maybeSingle(),
      ]);
      return { defs: defs ?? [], rows: rows ?? [], balance: profile?.discount_points ?? 0 };
    },
  });

  async function handleClaim(slug: string) {
    try {
      const res = await claim({ data: { slug } });
      toast.success(`+${res.awarded} points · balance ${res.balance}`);
      qc.invalidateQueries({ queryKey: ["employee-quests", userId] });
      qc.invalidateQueries({ queryKey: ["app-context"] });
    } catch (e: any) {
      toast.error(e.message ?? "Failed to claim");
    }
  }

  const rowsBySlug = new Map((data?.rows ?? []).map((r: any) => [r.quest_slug, r]));
  const defs = data?.defs ?? [];
  const questStats = defs.reduce(
    (stats: { claimed: number; claimable: number; inProgress: number; total: number }, d: any) => {
      const row = rowsBySlug.get(d.slug) as any;
      const completed = !!row?.completed_at;
      const claimed = !!row?.claimed_at;
      stats.total += 1;
      if (claimed) stats.claimed += 1;
      else if (completed) stats.claimable += 1;
      else stats.inProgress += 1;
      return stats;
    },
    { claimed: 0, claimable: 0, inProgress: 0, total: 0 },
  );
  const totalEarnable = defs.reduce((sum: number, d: any) => sum + (d.points ?? 0), 0);
  const claimedPoints = defs.reduce((sum: number, d: any) => {
    const row = rowsBySlug.get(d.slug) as any;
    return row?.claimed_at ? sum + (d.points ?? 0) : sum;
  }, 0);

  if (isLoading) {
    return (
      <section className="mt-10 space-y-5">
        <div className="h-52 bg-white hairline rounded-3xl animate-pulse" />
        <div className="grid md:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-56 bg-white hairline rounded-3xl animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="mt-10 space-y-6">
      <div className="relative overflow-hidden bg-ink text-cream rounded-3xl p-6 md:p-8 hairline fade-up">
        <div className="grid lg:grid-cols-[1fr_360px] gap-8 items-end">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cream/60 mb-3">Quest credits</div>
            <h2 className="font-serif text-4xl md:text-5xl tracking-tight max-w-2xl">Earn points. Spend them at checkout.</h2>
            <p className="text-cream/70 mt-3 text-sm max-w-xl">
              Complete small actions across PERX, claim credits, then use them like ALL at checkout. Credits can cover up to 50% of a request.
            </p>
            <div className="grid sm:grid-cols-3 gap-3 mt-7 max-w-2xl">
              <Stat icon={CheckCircle2} label="Claimed" value={questStats.claimed} />
              <Stat icon={Sparkles} label="Ready" value={questStats.claimable} />
              <Stat icon={Target} label="In progress" value={questStats.inProgress} />
            </div>
          </div>
          <div className="bg-cream text-ink rounded-3xl p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-soft">Available balance</div>
                <div className="font-serif text-5xl leading-none mt-2 tabular-nums">{data?.balance ?? 0}</div>
              </div>
              <div className="size-14 rounded-full bg-ink text-cream grid place-items-center">
                <Coins className="size-6" />
              </div>
            </div>
            <div className="mt-5 h-2 bg-paper rounded-full overflow-hidden">
              <div
                className="h-full bg-sage rounded-full"
                style={{ width: `${totalEarnable ? Math.min(100, Math.round((claimedPoints / totalEarnable) * 100)) : 0}%` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-ink-soft">
              <span>{claimedPoints} claimed</span>
              <span>{totalEarnable} total pts</span>
            </div>
          </div>
        </div>
      </div>

      {defs.length === 0 ? (
        <div className="hairline bg-white rounded-3xl p-12 text-center text-ink-soft">
          <Gift className="size-8 mx-auto mb-3 text-accent-red" />
          <p className="font-serif text-2xl text-ink">No quests yet.</p>
          <p className="text-sm mt-1">Check back soon for new ways to earn credits.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {defs.map((d: any) => {
            const row = rowsBySlug.get(d.slug) as any;
            const progress = row?.progress ?? 0;
            const completed = !!row?.completed_at;
            const claimed = !!row?.claimed_at;
            const pct = Math.min(100, Math.round((progress / d.target) * 100));
            const state = claimed ? "claimed" : completed ? "claimable" : "progress";
            return (
              <article
                key={d.slug}
                className={`hairline rounded-3xl p-5 min-h-[250px] flex flex-col gap-4 fade-up ${
                  state === "claimable"
                    ? "bg-accent-red text-cream border-accent-red"
                    : state === "claimed"
                      ? "bg-white opacity-70"
                      : "bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${
                      state === "claimable" ? "bg-cream text-accent-red" : "bg-paper text-accent-red"
                    }`}>
                      <Trophy className="size-3" />
                      {d.points} pts
                    </div>
                    <h3 className="font-serif text-2xl leading-tight mt-4">{d.title}</h3>
                  </div>
                  {state === "claimed" ? (
                    <div className="size-9 rounded-full bg-sage/15 text-sage grid place-items-center shrink-0">
                      <Check className="size-5" />
                    </div>
                  ) : state === "claimable" ? (
                    <div className="size-9 rounded-full bg-cream/15 text-cream grid place-items-center shrink-0">
                      <Sparkles className="size-5" />
                    </div>
                  ) : (
                    <div className="size-9 rounded-full bg-paper text-ink-soft grid place-items-center shrink-0">
                      <Target className="size-5" />
                    </div>
                  )}
                </div>
                <p className={`text-sm leading-relaxed ${state === "claimable" ? "text-cream/80" : "text-ink-soft"}`}>{d.description}</p>
                <div className="mt-auto space-y-3">
                  <div className={`h-2 rounded-full overflow-hidden ${state === "claimable" ? "bg-cream/20" : "bg-paper"}`}>
                    <div
                      className={`h-full rounded-full transition-all ${state === "claimable" ? "bg-cream" : "bg-ink"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className={`flex items-center justify-between text-xs ${state === "claimable" ? "text-cream/80" : "text-ink-soft"}`}>
                    <span className="tabular-nums">{progress} / {d.target} complete</span>
                    <span className="tabular-nums">{pct}%</span>
                  </div>
                  {claimed ? (
                    <div className="flex items-center justify-between text-sm font-semibold text-sage">
                      <span>Claimed</span>
                      <CheckCircle2 className="size-4" />
                    </div>
                  ) : completed ? (
                    <button
                      onClick={() => handleClaim(d.slug)}
                      className="w-full flex items-center justify-center gap-2 bg-cream text-accent-red rounded-full px-4 py-3 text-sm font-bold hover:bg-ink hover:text-cream transition-colors"
                    >
                      Claim reward <ArrowRight className="size-4" />
                    </button>
                  ) : (
                    <div className="flex items-center justify-between text-sm font-semibold text-ink">
                      <span>Keep going</span>
                      <ArrowRight className="size-4 text-ink-soft" />
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <div className="bg-cream/10 rounded-2xl p-4">
      <div className="flex items-center gap-2 text-cream/70 text-[10px] font-semibold uppercase tracking-[0.18em]">
        <Icon className="size-3.5" />
        {label}
      </div>
      <div className="font-serif text-3xl leading-none mt-2 tabular-nums">{value}</div>
    </div>
  );
}
