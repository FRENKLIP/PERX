import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatAll } from "@/lib/i18n";
import { CheckCircle2, Clock, XCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/requests")({
  head: () => ({ meta: [{ title: "Requests — Perka" }] }),
  component: Requests,
});

function Requests() {
  const { data } = useQuery({
    queryKey: ["my-requests"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return [];
      const { data } = await supabase.from("requests")
        .select("*, request_items(*)")
        .eq("employee_id", u.user.id).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  return (
    <div className="max-w-4xl mx-auto px-6 pt-10">
      <h1 className="font-display text-4xl tracking-tight mb-8">Your requests</h1>
      {(data ?? []).length === 0 ? (
        <div className="bg-white border border-border-soft rounded-3xl p-12 text-center text-foreground/60">No requests yet. Pick something from the marketplace.</div>
      ) : (
        <div className="space-y-4">
          {data?.map((r) => (
            <div key={r.id} className="bg-white border border-border-soft rounded-3xl p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="text-xs font-bold uppercase tracking-widest text-foreground/40">{new Date(r.created_at).toLocaleDateString()}</div>
                  <div className="font-display text-xl mt-1">{r.ai_package_name || `Request · ${r.id.slice(0,8)}`}</div>
                </div>
                <StatusBadge status={r.status} />
              </div>
              <div className="space-y-2 mb-4">
                {(r as any).request_items?.map((it: any) => (
                  <div key={it.id} className="flex items-center justify-between text-sm py-2 border-t border-border-soft">
                    <div>
                      <div className="font-semibold">{it.offer_title}</div>
                      {it.redemption_code && (
                        <div className="text-xs text-accent-red font-mono mt-0.5">Code: {it.redemption_code}</div>
                      )}
                    </div>
                    <span className="font-bold">{formatAll(it.price_all)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center pt-4 border-t border-border-soft">
                <span className="text-xs font-bold uppercase tracking-widest text-foreground/50">Total</span>
                <span className="font-display text-2xl font-extrabold">{formatAll(r.total_all)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map = {
    pending: { Icon: Clock, label: "Pending", cls: "bg-accent-orange/15 text-accent-orange" },
    approved: { Icon: CheckCircle2, label: "Approved", cls: "bg-emerald-500/15 text-emerald-700" },
    rejected: { Icon: XCircle, label: "Rejected", cls: "bg-accent-red/15 text-accent-red" },
  } as const;
  const m = map[status as keyof typeof map] ?? map.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${m.cls}`}>
      <m.Icon className="size-3.5" /> {m.label}
    </span>
  );
}