import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { recomputeEmployeeQuests, claimEmployeeQuest } from "@/lib/employee-quests.functions";
import { Coins, Check, Sparkles } from "lucide-react";
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

  const { data } = useQuery({
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

  return (
    <section className="mt-12">
      <div className="flex items-end justify-between gap-4 mb-6 flex-wrap">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-soft mb-2">Quests</div>
          <h2 className="font-serif text-4xl tracking-tight">Earn points. Use at checkout.</h2>
          <p className="text-ink-soft mt-2 text-sm max-w-lg">1 point = 1 ALL off. Cap of 50% per request.</p>
        </div>
        <div className="flex items-center gap-2 bg-ink text-cream rounded-full px-5 py-3">
          <Coins className="size-4" />
          <div>
            <div className="text-[9px] font-semibold uppercase tracking-[0.2em] text-cream/60">Balance</div>
            <div className="font-serif text-2xl leading-none tabular-nums">{data?.balance ?? 0}</div>
          </div>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(data?.defs ?? []).map((d: any) => {
          const row = rowsBySlug.get(d.slug) as any;
          const progress = row?.progress ?? 0;
          const completed = !!row?.completed_at;
          const claimed = !!row?.claimed_at;
          const pct = Math.min(100, Math.round((progress / d.target) * 100));
          return (
            <div key={d.slug} className={`hairline bg-white rounded-3xl p-5 flex flex-col gap-3 ${claimed ? "opacity-60" : ""}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-accent-red">{d.points} pts</div>
                  <div className="font-serif text-xl leading-tight mt-1">{d.title}</div>
                </div>
                {claimed && <Check className="size-5 text-sage shrink-0" />}
              </div>
              <p className="text-xs text-ink-soft">{d.description}</p>
              <div className="mt-auto">
                <div className="h-1.5 bg-paper rounded-full overflow-hidden mb-2">
                  <div className="h-full bg-ink rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
                <div className="flex items-center justify-between text-xs text-ink-soft">
                  <span className="tabular-nums">{progress} / {d.target}</span>
                  {claimed ? (
                    <span className="text-sage font-semibold">Claimed</span>
                  ) : completed ? (
                    <button onClick={() => handleClaim(d.slug)} className="flex items-center gap-1 bg-accent-red text-cream rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest hover:bg-ink transition-colors">
                      <Sparkles className="size-3" /> Claim
                    </button>
                  ) : (
                    <span className="text-ink-soft">In progress</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}