import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, Check, X, Clock } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/pairs")({
  head: () => ({ meta: [{ title: "Pairs — PERX" }] }),
  component: PairsPage,
});

function PairsPage() {
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ["my-pairs"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return { incoming: [], outgoing: [] };
      const select = "*, offer:offer_id(id,title,image_url,price_all), provider:provider_company_id(name,neighborhood)";
      const [{ data: incoming }, { data: outgoing }] = await Promise.all([
        supabase.from("pair_invitations").select(select).eq("invitee_id", u.user.id).order("created_at", { ascending: false }),
        supabase.from("pair_invitations").select(select).eq("inviter_id", u.user.id).order("created_at", { ascending: false }),
      ]);
      const all = [...(incoming ?? []), ...(outgoing ?? [])];
      const ids = Array.from(new Set(all.flatMap((p: any) => [p.inviter_id, p.invitee_id])));
      const { data: profs } = ids.length
        ? await supabase.from("profiles").select("id, full_name, avatar_url").in("id", ids)
        : { data: [] as any[] };
      const byId = new Map((profs ?? []).map((p: any) => [p.id, p]));
      const hydrate = (p: any) => ({
        ...p,
        inviter: byId.get(p.inviter_id) ?? null,
        invitee: byId.get(p.invitee_id) ?? null,
      });
      return {
        incoming: (incoming ?? []).map(hydrate),
        outgoing: (outgoing ?? []).map(hydrate),
      };
    },
  });

  async function respond(id: string, accept: boolean) {
    const { error } = await supabase
      .from("pair_invitations")
      .update({ status: accept ? "accepted" : "declined", accepted_at: accept ? new Date().toISOString() : null })
      .eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(accept ? "Pair accepted" : "Declined");
    qc.invalidateQueries({ queryKey: ["my-pairs"] });
  }

  const incoming = data?.incoming ?? [];
  const outgoing = data?.outgoing ?? [];
  const pendingIncoming = incoming.filter((i: any) => i.status === "pending");

  return (
    <div className="max-w-4xl mx-auto px-6 pt-10 pb-20 fade-up">
      <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent-red mb-3">Pair perks</div>
      <h1 className="font-serif text-5xl md:text-6xl tracking-tight">Spend together, both win.</h1>
      <p className="text-ink-soft text-lg mt-4 max-w-lg">
        Invite a teammate to a perk and you both get a bonus. The company pitches in.
      </p>

      <Section title="Incoming" count={pendingIncoming.length}>
        {incoming.length === 0
          ? <Empty text="No invitations yet." />
          : incoming.map((p: any) => <Card key={p.id} p={p} role="invitee" onRespond={respond} />)}
      </Section>

      <Section title="Sent" count={outgoing.length}>
        {outgoing.length === 0
          ? <Empty text="You haven't invited anyone yet — open any offer to start." />
          : outgoing.map((p: any) => <Card key={p.id} p={p} role="inviter" />)}
      </Section>
    </div>
  );
}

function Section({ title, count, children }: any) {
  return (
    <section className="mt-14">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="font-serif text-2xl tracking-tight">{title}</h2>
        {count > 0 ? <span className="text-xs font-bold uppercase tracking-widest text-ink-soft">{count}</span> : null}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="hairline rounded-2xl bg-white px-5 py-8 text-center text-sm text-ink-soft">{text}</div>;
}

function Card({ p, role, onRespond }: { p: any; role: "inviter" | "invitee"; onRespond?: (id: string, accept: boolean) => void }) {
  const other = role === "invitee" ? p.inviter : p.invitee;
  const isPending = p.status === "pending";
  const isAccepted = p.status === "accepted";
  const isDeclined = p.status === "declined";
  return (
    <div className="hairline rounded-3xl bg-white p-4 flex items-center gap-4">
      {p.offer?.image_url
        ? <img src={p.offer.image_url} alt="" className="size-16 rounded-2xl object-cover" />
        : <div className="size-16 rounded-2xl bg-paper grid place-items-center"><Users className="size-5 text-ink-soft" /></div>}
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent-red">
          {role === "invitee" ? "Invited by" : "You invited"} {other?.full_name ?? "teammate"}
        </div>
        <Link to="/offer/$offerId" params={{ offerId: p.offer?.id }} className="font-serif text-xl leading-tight block truncate hover:underline">
          {p.offer?.title}
        </Link>
        <div className="text-xs text-ink-soft truncate mt-0.5">
          {p.provider?.name}{p.provider?.neighborhood ? ` · ${p.provider.neighborhood}` : ""} · +{p.bonus_pct}%{p.bonus_note ? ` · ${p.bonus_note}` : ""}
        </div>
      </div>
      <div className="shrink-0 flex items-center gap-2">
        {isPending && role === "invitee" && onRespond && (
          <>
            <button onClick={() => onRespond(p.id, true)} className="size-10 rounded-full bg-sage text-cream grid place-items-center hover:bg-sage/90 transition-colors" title="Accept">
              <Check className="size-4" />
            </button>
            <button onClick={() => onRespond(p.id, false)} className="size-10 rounded-full hairline hover:bg-paper grid place-items-center" title="Decline">
              <X className="size-4" />
            </button>
          </>
        )}
        {isPending && role === "inviter" && (
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-ink-soft"><Clock className="size-3" /> pending</span>
        )}
        {isAccepted && <span className="text-[10px] font-bold uppercase tracking-widest text-sage">Accepted</span>}
        {isDeclined && <span className="text-[10px] font-bold uppercase tracking-widest text-ink-soft">Declined</span>}
      </div>
    </div>
  );
}