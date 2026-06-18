import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatAll } from "@/lib/i18n";
import { toast } from "sonner";
import { useMemo, useState } from "react";
import { Sparkles, CheckCircle2, XCircle } from "lucide-react";
import { BarChart, Bar, XAxis, ResponsiveContainer, Cell, Tooltip } from "recharts";

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

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    (data?.requests ?? []).forEach((r) => {
      (r as any).request_items?.forEach((it: any) => {
        // category isn't stored on item; group by simple keyword in title
        const key = it.offer_title?.toLowerCase().includes("gym") || it.offer_title?.toLowerCase().includes("yoga") || it.offer_title?.toLowerCase().includes("spa") || it.offer_title?.toLowerCase().includes("pool") ? "wellness"
          : it.offer_title?.toLowerCase().includes("ksamil") || it.offer_title?.toLowerCase().includes("theth") || it.offer_title?.toLowerCase().includes("dajti") || it.offer_title?.toLowerCase().includes("dhërmi") || it.offer_title?.toLowerCase().includes("llogara") ? "travel"
          : it.offer_title?.toLowerCase().includes("coding") || it.offer_title?.toLowerCase().includes("language") || it.offer_title?.toLowerCase().includes("coolab") || it.offer_title?.toLowerCase().includes("destil") ? "learning"
          : "food";
        map.set(key, (map.get(key) ?? 0) + (it.price_all ?? 0));
      });
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [data]);
  const palette: Record<string, string> = { wellness: "#7a8b6f", food: "#c5503a", travel: "#171717", learning: "#d98b5f" };

  return (
    <div className="max-w-6xl mx-auto px-6 pt-10">
      <div className="fade-up mb-10">
        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-soft mb-2">Employer</div>
        <h1 className="font-serif text-5xl tracking-tight">How your team is spending their wellbeing.</h1>
      </div>

      <div className="grid md:grid-cols-3 gap-px bg-border-soft hairline rounded-3xl overflow-hidden mb-10 fade-up">
        <Stat label="Pending approvals" value={pending.length.toString()} />
        <Stat label="Approved this period" value={approved.length.toString()} />
        <Stat label="Total committed" value={formatAll(totalApproved)} />
      </div>

      <div className="grid md:grid-cols-5 gap-6 mb-10">
        <div className="md:col-span-3 bg-ink text-cream rounded-3xl p-8 fade-up">
          <div className="flex items-start justify-between mb-4 gap-4">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cream/60 mb-2 flex items-center gap-2"><Sparkles className="size-3 text-accent-orange" /> PERX AI · Team insights</div>
              <h3 className="font-serif text-2xl">What your people actually value.</h3>
            </div>
            <button onClick={generateInsight} disabled={loadingInsight} className="bg-cream text-ink px-5 py-2.5 rounded-full font-semibold text-sm disabled:opacity-50 shrink-0">
              {loadingInsight ? "Thinking…" : insight ? "Regenerate" : "Generate"}
            </button>
          </div>
          {insight ? (
            <p className="text-sm leading-relaxed opacity-90 whitespace-pre-wrap font-serif text-lg">{insight}</p>
          ) : (
            <p className="text-sm text-cream/60">Click Generate to read this period in plain English.</p>
          )}
        </div>
        <div className="md:col-span-2 hairline bg-white rounded-3xl p-6 fade-up">
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-soft mb-3">By category</div>
          {byCategory.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={byCategory}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: any) => formatAll(v)} cursor={{ fill: "#17171708" }} />
                <Bar dataKey="value" radius={[6,6,0,0]}>
                  {byCategory.map((c) => <Cell key={c.name} fill={palette[c.name] ?? "#171717"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] grid place-items-center text-ink-soft text-sm">No spending yet.</div>
          )}
        </div>
      </div>

      <h2 className="font-serif text-3xl mb-4">Pending approvals</h2>
      {pending.length === 0 ? (
        <div className="hairline rounded-3xl p-12 text-center text-ink-soft mb-10">Nothing waiting.</div>
      ) : (
        <div className="space-y-3 mb-10">
          {pending.map((r) => (
            <div key={r.id} className="hairline bg-white rounded-3xl p-6 fade-up">
              <div className="flex justify-between items-start mb-3 gap-4">
                <div className="min-w-0">
                  <div className="font-serif text-xl">{r.ai_package_name || `Request · ${r.id.slice(0,8)}`}</div>
                  <div className="text-xs text-ink-soft mt-0.5">{new Date(r.created_at).toLocaleString()}</div>
                  {r.note && <p className="text-sm mt-2 italic text-ink-soft">"{r.note}"</p>}
                </div>
                <div className="font-serif text-2xl shrink-0">{formatAll(r.total_all)}</div>
              </div>
              <div className="space-y-1 mb-4">
                {(r as any).request_items?.map((it: any) => (
                  <div key={it.id} className="flex justify-between text-sm py-1.5 border-t border-border-soft">
                    <span>{it.offer_title}</span><span className="font-semibold">{formatAll(it.price_all)}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={() => decide(r.id, "approved")} className="flex-1 bg-sage text-cream py-3 rounded-full font-semibold text-sm hover:bg-ink transition-colors flex items-center justify-center gap-2">
                  <CheckCircle2 className="size-4" /> Approve & pay providers
                </button>
                <button onClick={() => decide(r.id, "rejected")} className="px-5 hairline text-ink-soft py-3 rounded-full font-semibold text-sm hover:bg-accent-red hover:text-cream flex items-center gap-2">
                  <XCircle className="size-4" /> Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {approved.length > 0 && (
        <>
          <h2 className="font-serif text-3xl mb-4">Recent approvals</h2>
          <div className="space-y-2">
            {approved.slice(0, 6).map((r) => (
              <div key={r.id} className="hairline bg-white rounded-2xl p-4 flex justify-between items-center">
                <div>
                  <div className="font-medium text-sm">{r.ai_package_name || r.id.slice(0,8)}</div>
                  <div className="text-xs text-ink-soft">{new Date(r.decided_at ?? r.created_at).toLocaleDateString()}</div>
                </div>
                <div className="font-semibold">{formatAll(r.total_all)}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white p-6">
      <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-soft mb-2">{label}</div>
      <div className="font-serif text-4xl">{value}</div>
    </div>
  );
}