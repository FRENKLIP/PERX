import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, Search, Send } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

type Props = {
  offerId: string;
  providerCompanyId: string;
  pairBonusPct: number;
  pairBonusNote?: string | null;
  className?: string;
};

export function PairInviteButton({ offerId, providerCompanyId, pairBonusPct, pairBonusNote, className }: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [sending, setSending] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data: me } = useQuery({
    queryKey: ["me-employer"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data: p } = await supabase.from("profiles").select("id, employer_company_id").eq("id", u.user.id).maybeSingle();
      return p;
    },
  });

  const { data: teammates } = useQuery({
    enabled: open && !!me?.employer_company_id,
    queryKey: ["teammates", me?.employer_company_id, q],
    queryFn: async () => {
      let query = supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .eq("employer_company_id", me!.employer_company_id!)
        .neq("id", me!.id)
        .limit(10);
      if (q.trim()) query = query.ilike("full_name", `%${q.trim()}%`);
      const { data } = await query;
      return data ?? [];
    },
  });

  async function invite(inviteeId: string) {
    if (!me?.employer_company_id) return;
    setSending(inviteeId);
    const { error } = await supabase.from("pair_invitations").insert({
      offer_id: offerId,
      inviter_id: me.id,
      invitee_id: inviteeId,
      employer_company_id: me.employer_company_id,
      provider_company_id: providerCompanyId,
      bonus_pct: pairBonusPct,
      bonus_note: pairBonusNote ?? null,
    });
    setSending(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Invitation sent");
    qc.invalidateQueries({ queryKey: ["my-pairs"] });
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className={
            className ??
            "w-full hairline bg-sage/10 text-sage rounded-2xl py-3.5 font-semibold text-sm hover:bg-sage hover:text-cream transition-colors inline-flex items-center justify-center gap-2"
          }
        >
          <Users className="size-4" /> Make it a pair perk · +{pairBonusPct}%
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl tracking-tight">Invite a teammate</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-ink-soft -mt-2">
          When they accept, you each get <span className="font-semibold text-ink">+{pairBonusPct}%</span> off this perk
          {pairBonusNote ? <> · <span className="italic">{pairBonusNote}</span></> : null}.
        </p>

        <div className="relative mt-2">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search your teammates…"
            className="w-full bg-cream border border-border-soft rounded-2xl pl-10 pr-4 py-3 text-sm outline-none focus:border-ink"
          />
        </div>

        <div className="max-h-72 overflow-y-auto space-y-1">
          {(teammates ?? []).length === 0 && (
            <div className="text-xs text-ink-soft px-2 py-6 text-center">No teammates found.</div>
          )}
          {(teammates ?? []).map((t: any) => (
            <button
              key={t.id}
              onClick={() => invite(t.id)}
              disabled={sending === t.id}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-paper transition-colors text-left disabled:opacity-50"
            >
              {t.avatar_url
                ? <img src={t.avatar_url} alt="" className="size-9 rounded-full object-cover" />
                : <div className="size-9 rounded-full bg-ink text-cream grid place-items-center text-[10px] font-bold">{(t.full_name ?? "??").slice(0,2).toUpperCase()}</div>}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">{t.full_name ?? "Teammate"}</div>
              </div>
              <Send className="size-4 text-ink-soft" />
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}