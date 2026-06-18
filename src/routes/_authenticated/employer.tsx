import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatAll } from "@/lib/i18n";
import { toast } from "sonner";
import { useState } from "react";
import { Sparkles, CheckCircle2, XCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/employer")({
  head: () => ({ meta: [{ title: "Employer — PERX" }] }),
  beforeLoad: async () => {
    const { requireRole } = await import("@/lib/roles");
    await requireRole(["employer_admin"]);
  },
  component: EmployerDashboard,
});

function EmployerDashboard() {
  const qc = useQueryClient();
  const [insight, setInsight] = useState<string | null>(null);
  const [loadingInsight, setLoadingInsight] = useState(false);

  const { data } = useQuery({
    queryKey: ["employer-data"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data: roles } = await supabase.from("user_roles").select("company_id").eq("user_id", u.user.id).eq("role", "employer_admin");
      const companyIds = (roles ?? []).map((r) => r.company_id).filter(Boolean) as string[];
      if (companyIds.length === 0) return null;
      const { data: requests } = await supabase.from("requests")
        .select("*, request_items(*)")
        .in("employer_company_id", companyIds).order("created_at", { ascending: false });
      return { requests: requests ?? [], companyIds };
    },
  });

  async function decide(reqId: string, status: "approved" | "rejected") {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase.from("requests").update({
      status, decided_at: new Date().toISOString(), decided_by: u.user.id,
    }).eq("id", reqId);
    if (error) { toast.error(error.message); return; }
    if (status === "approved") {
      const code = () => Math.random().toString(36).slice(2, 8).toUpperCase();
      const { data: items } = await supabase.from("request_items").select("id").eq("request_id", reqId);
      for (const it of items ?? []) {
        await supabase.from("request_items").update({ payment_status: "simulated_paid", redemption_code: `PRK-${code()}` }).eq("id", it.id);
      }
    }
    toast.success(status === "approved" ? "Approved — payment routed to providers" : "Rejected");
    qc.invalidateQueries();
  }

  async function generateInsight() {
    if (!data) return;
    setLoadingInsight(true);
    try {
      const summary = (data.requests ?? []).map((r) => ({
        status: r.status,
        total: r.total_all,
        items: (r as any).request_items?.map((i: any) => ({ title: i.offer_title, price: i.price_all })),
      }));
      const res = await fetch("/api/insights", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ requests: summary }),
      });
      const json = await res.json();
      setInsight(json.text ?? "Could not generate insights.");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoadingInsight(false);
    }
  }

  const pending = (data?.requests ?? []).filter((r) => r.status === "pending");
  const approved = (data?.requests ?? []).filter((r) => r.status === "approved");
  const totalApproved = approved.reduce((s, r) => s + r.total_all, 0);

  return (
    <div className="max-w-6xl mx-auto px-6 pt-10">
      <h1 className="font-display text-4xl tracking-tight mb-2">Employer dashboard</h1>
      <p className="text-foreground/60 mb-8">Approvals, team usage, and AI insights into what your people value.</p>

      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <Stat label="Pending approvals" value={pending.length.toString()} />
        <Stat label="Approved this period" value={approved.length.toString()} />
        <Stat label="Total committed" value={formatAll(totalApproved)} />
      </div>

      <div className="bg-ink text-cream rounded-3xl p-8 mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-display text-xl flex items-center gap-2"><Sparkles className="size-5 text-accent-orange" /> AI team insights</h3>
            <p className="text-sm opacity-60 mt-1">A summary of what your team values, written by PERX AI.</p>
          </div>
          <button onClick={generateInsight} disabled={loadingInsight} className="bg-accent-orange text-ink px-5 py-2.5 rounded-xl font-bold text-sm disabled:opacity-50">
            {loadingInsight ? "Thinking..." : insight ? "Regenerate" : "Generate"}
          </button>
        </div>
        {insight && <p className="text-sm leading-relaxed opacity-90 whitespace-pre-wrap">{insight}</p>}
      </div>

      <h2 className="font-display text-2xl mb-4">Pending approvals</h2>
      {pending.length === 0 ? (
        <div className="bg-white border border-border-soft rounded-3xl p-12 text-center text-foreground/60">Nothing waiting.</div>
      ) : (
        <div className="space-y-4 mb-10">
          {pending.map((r) => (
            <div key={r.id} className="bg-white border border-border-soft rounded-3xl p-6">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="font-display text-lg">{r.ai_package_name || `Request · ${r.id.slice(0,8)}`}</div>
                  <div className="text-xs text-foreground/50 mt-0.5">{new Date(r.created_at).toLocaleString()}</div>
                  {r.note && <p className="text-sm mt-2 italic">"{r.note}"</p>}
                </div>
                <div className="font-display text-2xl font-extrabold">{formatAll(r.total_all)}</div>
              </div>
              <div className="space-y-1 mb-4">
                {(r as any).request_items?.map((it: any) => (
                  <div key={it.id} className="flex justify-between text-sm py-1.5 border-t border-border-soft">
                    <span>{it.offer_title}</span><span className="font-semibold">{formatAll(it.price_all)}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={() => decide(r.id, "approved")} className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-emerald-700 flex items-center justify-center gap-2">
                  <CheckCircle2 className="size-4" /> Approve & pay providers
                </button>
                <button onClick={() => decide(r.id, "rejected")} className="px-5 bg-cream border border-border-soft text-foreground/70 py-3 rounded-xl font-bold text-sm hover:bg-accent-red hover:text-white hover:border-accent-red flex items-center gap-2">
                  <XCircle className="size-4" /> Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <h2 className="font-display text-2xl mb-4">Recent approvals</h2>
      <div className="space-y-2">
        {approved.slice(0, 5).map((r) => (
          <div key={r.id} className="bg-white border border-border-soft rounded-2xl p-4 flex justify-between items-center">
            <div>
              <div className="font-semibold text-sm">{r.ai_package_name || r.id.slice(0,8)}</div>
              <div className="text-xs text-foreground/50">{new Date(r.decided_at ?? r.created_at).toLocaleDateString()}</div>
            </div>
            <div className="font-bold">{formatAll(r.total_all)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border border-border-soft rounded-3xl p-6">
      <div className="text-xs font-bold uppercase tracking-widest text-foreground/40 mb-2">{label}</div>
      <div className="font-display text-3xl font-extrabold">{value}</div>
    </div>
  );
}