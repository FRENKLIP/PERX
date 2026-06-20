import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { recomputeQuests, claimQuest } from "@/lib/quests.functions";
import { Trophy, Sparkles, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function QuestsTab({ companyId }: { companyId: string }) {
  const qc = useQueryClient();
  const recompute = useServerFn(recomputeQuests);
  const claim = useServerFn(claimQuest);
  const [claiming, setClaiming] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId) return;
    recompute({ data: { companyId } })
      .then(() => qc.invalidateQueries({ queryKey: ["company-quests", companyId] }))
      .catch((e) => toast.error(e.message));
  }, [companyId, recompute, qc]);

  const { data } = useQuery({
    queryKey: ["company-quests", companyId],
    queryFn: async () => {
      const [{ data: defs }, { data: rows }, { data: company }] = await Promise.all([
        supabase.from("quest_definitions").select("*").order("sort_order"),
        supabase.from("company_quests").select("*").eq("company_id", companyId),
        supabase.from("companies").select("discount_points").eq("id", companyId).maybeSingle(),
      ]);
      return { defs: defs ?? [], rows: rows ?? [], points: company?.discount_points ?? 0 };
    },
    enabled: !!companyId,
  });

  async function onClaim(slug: string) {
    setClaiming(slug);
    try {
      const res = await claim({ data: { companyId, slug } });
      toast.success(`+${res.awarded} discount points`);
      qc.invalidateQueries({ queryKey: ["company-quests", companyId] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setClaiming(null);
    }
  }

  const rowsBySlug = new Map((data?.rows ?? []).map((r: any) => [r.quest_slug, r]));

  return (
    <div className="space-y-8">
      <div className="fade-up">
        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-soft mb-2">Employer console</div>
        <h1 className="font-serif text-5xl tracking-tight">Quests.</h1>
        <p className="text-ink-soft mt-3 max-w-xl">Complete milestones to earn discount points. Spend them in Billing for up to 50% off your next subscription invoice.</p>
      </div>

      <div className="hairline bg-ink text-cream rounded-3xl p-6 flex items-center justify-between fade-up">
        <div className="flex items-center gap-4">
          <div className="size-12 grid place-items-center rounded-full bg-cream/10">
            <Trophy className="size-6" />
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cream/60">Discount points</div>
            <div className="font-serif text-4xl">{(data?.points ?? 0).toLocaleString()}</div>
          </div>
        </div>
        <div className="text-xs text-cream/60 max-w-[200px] text-right">1 point = 1 ALL off. Capped at 50% of any invoice.</div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {(data?.defs ?? []).map((d: any) => {
          const r = rowsBySlug.get(d.slug) as any;
          const progress = r?.progress ?? 0;
          const pct = Math.min(100, Math.round((progress / d.target) * 100));
          const completed = progress >= d.target;
          const claimed = !!r?.claimed_at;
          return (
            <div key={d.slug} className="hairline bg-white rounded-3xl p-6 fade-up">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <div className="font-serif text-2xl leading-tight">{d.title}</div>
                  <p className="text-sm text-ink-soft mt-1">{d.description}</p>
                </div>
                <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.15em] bg-accent-red/10 text-accent-red px-2.5 py-1 rounded-full inline-flex items-center gap-1">
                  <Sparkles className="size-3" /> +{d.points}
                </span>
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-xs text-ink-soft mb-1.5">
                  <span>{progress} / {d.target}</span>
                  <span>{pct}%</span>
                </div>
                <div className="h-2 rounded-full bg-paper overflow-hidden">
                  <div className="h-full bg-ink transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
              <div className="mt-4">
                {claimed ? (
                  <div className="text-sm text-ink-soft flex items-center gap-2"><Check className="size-4 text-sage" /> Claimed</div>
                ) : completed ? (
                  <button
                    onClick={() => onClaim(d.slug)}
                    disabled={claiming === d.slug}
                    className="px-5 py-2.5 rounded-full bg-ink text-cream text-sm font-semibold hover:bg-accent-red transition-colors inline-flex items-center gap-2 disabled:opacity-60"
                  >
                    {claiming === d.slug ? <Loader2 className="size-4 animate-spin" /> : <Trophy className="size-4" />}
                    Claim +{d.points} pts
                  </button>
                ) : (
                  <div className="text-xs text-ink-soft">Keep going — {d.target - progress} to go.</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}