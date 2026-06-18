import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatAll } from "@/lib/i18n";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/requests")({
  head: () => ({ meta: [{ title: "Requests — PERX" }] }),
  beforeLoad: async () => {
    const { requireRole } = await import("@/lib/roles");
    await requireRole("employee");
  },
  component: Requests,
});

function Requests() {
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
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

  const items = (data ?? []).filter((r) => filter === "all" || r.status === filter);

  return (
    <div className="max-w-4xl mx-auto px-6 pt-10">
      <div className="fade-up mb-8">
        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-soft mb-2">Your requests</div>
        <h1 className="font-serif text-5xl tracking-tight">Everything you've asked for.</h1>
      </div>

      <div className="flex gap-2 mb-8">
        {(["all", "pending", "approved", "rejected"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-full text-xs font-semibold capitalize transition-colors ${filter === f ? "bg-ink text-cream" : "hairline bg-white hover:bg-paper"}`}>
            {f} {f !== "all" && data ? `· ${data.filter((r) => r.status === f).length}` : ""}
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <div className="hairline rounded-3xl p-16 text-center text-ink-soft">Nothing here yet.</div>
      ) : (
        <ol className="relative border-l border-border-soft pl-6 space-y-6">
          {items.map((r) => (
            <li key={r.id} className="relative fade-up">
              <span className="absolute -left-[31px] top-2 size-3 rounded-full bg-ink" />
              <article className="hairline bg-white rounded-3xl p-6">
                <div className="flex justify-between items-start mb-4 gap-4">
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-soft">{new Date(r.created_at).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</div>
                    <div className="font-serif text-2xl mt-1">{r.ai_package_name || `Request · ${r.id.slice(0,8)}`}</div>
                    {r.note && <p className="text-sm text-ink-soft italic mt-2">"{r.note}"</p>}
                  </div>
                  <StatusBadge status={r.status} />
                </div>
                <div className="space-y-1 mb-4">
                  {(r as any).request_items?.map((it: any) => (
                    <div key={it.id} className="flex items-center justify-between text-sm py-2 border-t border-border-soft">
                      <div>
                        <div className="font-medium">{it.offer_title}</div>
                        {it.redemption_code && (
                          <div className="text-xs text-accent-red font-mono mt-0.5">Code · {it.redemption_code}</div>
                        )}
                      </div>
                      <span className="font-semibold">{formatAll(it.price_all)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between items-center pt-4 border-t border-border-soft">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-soft">Total</span>
                  <span className="font-serif text-2xl">{formatAll(r.total_all)}</span>
                </div>
              </article>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map = {
    pending: { Icon: Clock, label: "Pending", cls: "bg-accent-orange/15 text-accent-orange" },
    approved: { Icon: CheckCircle2, label: "Approved", cls: "bg-sage/15 text-sage" },
    rejected: { Icon: XCircle, label: "Rejected", cls: "bg-accent-red/15 text-accent-red" },
  } as const;
  const m = map[status as keyof typeof map] ?? map.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${m.cls}`}>
      <m.Icon className="size-3.5" /> {m.label}
    </span>
  );
}