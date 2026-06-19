import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatAll } from "@/lib/i18n";
import { toast } from "sonner";
import { useEffect, useMemo, useRef, useState } from "react";
import { Sparkles, CheckCircle2, XCircle, Clock, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { StatTile } from "@/components/StatTile";
import { TrendArea, CategoryDonut, TopBars, PeriodSwitcher, trendBuckets } from "@/components/DashboardCharts";
import { EmployeesTab } from "@/components/employer/EmployeesTab";
import { TalentEdgeCard, type TalentEdge } from "@/components/employer/TalentEdgeCard";
import { categorizeTitle } from "@/lib/categorize";

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
  const [insight, setInsight] = useState<TalentEdge | null>(null);
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [tab, setTab] = useState<"overview" | "approvals" | "employees">("overview");
  const insightInFlight = useRef(false);
  const insightKey = useRef<string | null>(null);

  const { data } = useQuery({
    queryKey: ["employer-data"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data: roles } = await supabase.from("user_roles").select("company_id").eq("user_id", u.user.id).eq("role", "employer_admin");
      const companyIds = (roles ?? []).map((r) => r.company_id).filter(Boolean) as string[];
      if (companyIds.length === 0) return null;
      const [{ data: requests }, { data: employees }, { data: providers }] = await Promise.all([
        supabase.from("requests")
          .select("*, request_items(*)")
          .in("employer_company_id", companyIds).order("created_at", { ascending: false }),
        supabase.from("profiles")
          .select("id, full_name, monthly_budget_all")
          .in("employer_company_id", companyIds),
        supabase.from("companies").select("id, name").eq("kind", "provider"),
      ]);
      return { requests: requests ?? [], employees: employees ?? [], providers: providers ?? [], companyIds };
    },
  });

  const [period, setPeriod] = useState<7 | 30 | 90>(30);

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
    if (insightInFlight.current) return;
    insightInFlight.current = true;
    setLoadingInsight(true);
    try {
      const cutoffMs = Date.now() - period * 24 * 60 * 60 * 1000;
      const approvedInWindow = (data.requests ?? []).filter(
        (r) => r.status === "approved" && new Date(r.decided_at ?? r.created_at).getTime() >= cutoffMs,
      );
      const items = approvedInWindow.flatMap((r) =>
        ((r as any).request_items ?? []).map((i: any) => ({
          offer_title: i.offer_title ?? "",
          price_all: i.price_all ?? 0,
        })),
      );
      const res = await fetch("/api/insights", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({
          items,
          period_days: period,
          approved_count: approvedInWindow.length,
        }),
      });
      const json = (await res.json()) as TalentEdge;
      setInsight(json);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoadingInsight(false);
      insightInFlight.current = false;
    }
  }

  // Auto-load Talent Edge when overview is visible and inputs change.
  useEffect(() => {
    if (tab !== "overview" || !data) return;
    const cutoffMs = Date.now() - period * 24 * 60 * 60 * 1000;
    const approvedCount = (data.requests ?? []).filter(
      (r) => r.status === "approved" && new Date(r.decided_at ?? r.created_at).getTime() >= cutoffMs,
    ).length;
    const key = `${period}:${approvedCount}`;
    if (insightKey.current === key) return;
    if (approvedCount < 3) return;
    insightKey.current = key;
    void generateInsight();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, period, data?.requests.length]);

  const pending = (data?.requests ?? []).filter((r) => r.status === "pending");
  const approved = (data?.requests ?? []).filter((r) => r.status === "approved");
  const rejected = (data?.requests ?? []).filter((r) => r.status === "rejected");

  const sinceMs = period * 24 * 60 * 60 * 1000;
  const cutoff = Date.now() - sinceMs;
  const approvedInPeriod = approved.filter((r) => new Date(r.decided_at ?? r.created_at).getTime() >= cutoff);
  const totalApproved = approvedInPeriod.reduce((s, r) => s + r.total_all, 0);
  const activeEmployees = new Set((data?.requests ?? []).filter((r) => new Date(r.created_at).getTime() >= cutoff).map((r) => r.employee_id)).size;
  const avgTicket = approvedInPeriod.length ? Math.round(totalApproved / approvedInPeriod.length) : 0;
  const totalBudget = (data?.employees ?? []).reduce((s, e: any) => s + (e.monthly_budget_all ?? 0), 0);
  const utilization = totalBudget ? Math.min(100, Math.round((totalApproved / totalBudget) * 100)) : 0;

  const trend = useMemo(() => trendBuckets(
    approved.map((r) => ({ date: r.decided_at ?? r.created_at, value: r.total_all })),
    period,
  ), [approved, period]);

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    approvedInPeriod.forEach((r) => {
      (r as any).request_items?.forEach((it: any) => {
        const key = categorizeTitle(it.offer_title ?? "");
        map.set(key, (map.get(key) ?? 0) + (it.price_all ?? 0));
      });
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [approvedInPeriod]);

  const topProviders = useMemo(() => {
    const map = new Map<string, number>();
    approvedInPeriod.forEach((r) => {
      (r as any).request_items?.forEach((it: any) => {
        const key = it.provider_company_id ?? "—";
        map.set(key, (map.get(key) ?? 0) + (it.price_all ?? 0));
      });
    });
    const nameOf = new Map((data?.providers ?? []).map((p: any) => [p.id, p.name]));
    return Array.from(map.entries())
      .map(([id, value]) => ({ name: (nameOf.get(id) as string) ?? "Provider", value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [approvedInPeriod, data]);

  const topEmployees = useMemo(() => {
    const map = new Map<string, number>();
    approvedInPeriod.forEach((r) => {
      map.set(r.employee_id, (map.get(r.employee_id) ?? 0) + r.total_all);
    });
    const nameOf = new Map((data?.employees ?? []).map((e: any) => [e.id, e.full_name]));
    return Array.from(map.entries())
      .map(([id, value]) => ({ id, name: (nameOf.get(id) as string) ?? `Employee · ${id.slice(-4)}`, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [approvedInPeriod, data]);

  const activity = useMemo(() => {
    return (data?.requests ?? [])
      .flatMap((r) => {
        const evs: { type: "submitted" | "approved" | "rejected"; date: string; r: any }[] = [
          { type: "submitted", date: r.created_at, r },
        ];
        if (r.decided_at && r.status === "approved") evs.push({ type: "approved", date: r.decided_at, r });
        if (r.decided_at && r.status === "rejected") evs.push({ type: "rejected", date: r.decided_at, r });
        return evs;
      })
      .sort((a, b) => +new Date(b.date) - +new Date(a.date))
      .slice(0, 8);
  }, [data]);

  return (
    <div>
      <div className="sticky top-[64px] z-30 bg-cream/85 backdrop-blur border-b border-border-soft">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center gap-2 overflow-x-auto">
          {([
            { id: "overview", label: "Overview", badge: 0 },
            { id: "approvals", label: "Approvals", badge: pending.length },
            { id: "employees", label: "Employees", badge: (data?.employees ?? []).length },
          ] as const).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors flex items-center gap-2 whitespace-nowrap ${
                tab === t.id ? "bg-ink text-cream" : "text-ink-soft hover:text-ink hover:bg-paper"
              }`}
            >
              {t.label}
              {t.badge > 0 && (
                <span className={`text-[10px] font-bold rounded-full px-2 py-0.5 ${
                  tab === t.id
                    ? "bg-cream/20 text-cream"
                    : t.id === "approvals" ? "bg-accent-red/20 text-accent-red" : "bg-paper text-ink-soft"
                }`}>{t.badge}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 pt-10">
      {tab === "employees" ? (
        <EmployeesTab companyIds={data?.companyIds ?? []} />
      ) : tab === "approvals" ? (
        <>
          <div className="flex items-end justify-between gap-6 mb-8 fade-up">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-soft mb-2">Employer console</div>
              <h1 className="font-serif text-5xl tracking-tight">Approvals{pending.length > 0 ? ` · ${pending.length} pending` : ""}.</h1>
            </div>
          </div>

          <h2 className="font-serif text-3xl mb-4">Pending</h2>
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
              <div className="space-y-2 pb-10">
                {approved.slice(0, 12).map((r) => (
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
        </>
      ) : (
      <>
      <div className="flex items-end justify-between gap-6 mb-10 fade-up">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-soft mb-2">Employer console</div>
          <h1 className="font-serif text-5xl tracking-tight">How your team is spending their wellbeing.</h1>
        </div>
        <PeriodSwitcher value={period} onChange={setPeriod} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-px bg-border-soft hairline rounded-3xl overflow-hidden mb-10 fade-up">
        <StatTile label="Pending" value={pending.length.toString()} hint={pending.length ? "awaiting review" : "all clear"} accent="orange" />
        <StatTile label={`Approved · ${period}d`} value={approvedInPeriod.length.toString()} hint={`${rejected.length} rejected total`} accent="sage" />
        <StatTile label="Total committed" value={formatAll(totalApproved)} hint={`avg ${formatAll(avgTicket)} / req`} accent="ink" />
        <StatTile label="Active employees" value={`${activeEmployees}`} hint={`of ${(data?.employees ?? []).length} on plan`} accent="ink" />
        <StatTile label="Wallet utilization" value={`${utilization}%`} hint={totalBudget ? `${formatAll(totalBudget)} budgeted` : "no budgets set"} accent="red" />
        <StatTile label="Avg ticket" value={formatAll(avgTicket)} hint={`${approvedInPeriod.length} approvals`} accent="ink" />
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-12 gap-6 mb-10">
        <div className="lg:col-span-7 hairline bg-white rounded-3xl p-6 fade-up">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-soft">Spend trend</div>
              <h3 className="font-serif text-2xl mt-1">Last {period} days</h3>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-soft">Committed</div>
              <div className="font-serif text-2xl">{formatAll(totalApproved)}</div>
            </div>
          </div>
          <TrendArea data={trend} />
        </div>
        <div className="lg:col-span-5 hairline bg-white rounded-3xl p-6 fade-up">
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-soft mb-1">Category mix</div>
          <h3 className="font-serif text-2xl mb-4">Where it goes</h3>
          <CategoryDonut data={byCategory} />
        </div>
      </div>

      {/* Leaderboards + activity */}
      <div className="grid lg:grid-cols-12 gap-6 mb-10">
        <div className="lg:col-span-5 hairline bg-white rounded-3xl p-6 fade-up">
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-soft mb-1">Top providers</div>
          <h3 className="font-serif text-2xl mb-4">Where the money lands</h3>
          <TopBars data={topProviders} color="#171717" />
        </div>
        <div className="lg:col-span-4 hairline bg-white rounded-3xl p-6 fade-up">
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-soft mb-1">Top employees</div>
          <h3 className="font-serif text-2xl mb-4">Most active</h3>
          {topEmployees.length === 0 ? (
            <div className="text-sm text-ink-soft py-8 text-center">No approved requests yet.</div>
          ) : (
            <ol className="space-y-2.5">
              {topEmployees.map((e, i) => (
                <li key={e.id} className="flex items-center gap-3 text-sm">
                  <span className="size-7 grid place-items-center rounded-full bg-paper font-serif text-sm">{i + 1}</span>
                  <span className="flex-1 truncate">{e.name}</span>
                  <span className="font-semibold tabular-nums">{formatAll(e.value)}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
        <div className="lg:col-span-3 hairline bg-white rounded-3xl p-6 fade-up">
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-soft mb-1">Activity</div>
          <h3 className="font-serif text-2xl mb-4">Latest events</h3>
          {activity.length === 0 ? (
            <div className="text-sm text-ink-soft py-8 text-center">Quiet for now.</div>
          ) : (
            <ul className="space-y-3">
              {activity.map((a, i) => {
                const Icon = a.type === "approved" ? ArrowUpRight : a.type === "rejected" ? ArrowDownRight : Clock;
                const color = a.type === "approved" ? "text-sage" : a.type === "rejected" ? "text-accent-red" : "text-ink-soft";
                return (
                  <li key={i} className="flex items-start gap-2 text-xs">
                    <Icon className={`size-3.5 mt-0.5 shrink-0 ${color}`} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate"><span className="font-semibold capitalize">{a.type}</span> · {formatAll(a.r.total_all)}</div>
                      <div className="text-ink-soft mt-0.5">{new Date(a.date).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-5 gap-6 mb-10">
        <TalentEdgeCard
          insight={insight}
          loading={loadingInsight}
          periodDays={period}
          onRefresh={generateInsight}
        />
        <div className="md:col-span-2 hairline rounded-3xl p-6 fade-up bg-paper/50 flex flex-col justify-between">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-soft mb-2">Approval rate</div>
            <div className="font-serif text-5xl">
              {(approved.length + rejected.length) > 0 ? Math.round((approved.length / (approved.length + rejected.length)) * 100) : 0}%
            </div>
            <div className="text-xs text-ink-soft mt-1">{approved.length} approved · {rejected.length} rejected · {pending.length} waiting</div>
          </div>
          <div className="text-sm text-ink-soft pt-6 border-t border-border-soft mt-6">
            Avg approval time:&nbsp;
            <span className="text-ink font-semibold">
              {(() => {
                const decided = approved.filter((r) => r.decided_at);
                if (decided.length === 0) return "—";
                const avgMs = decided.reduce((s, r) => s + (+new Date(r.decided_at!) - +new Date(r.created_at)), 0) / decided.length;
                const h = avgMs / 36e5;
                return h < 24 ? `${h.toFixed(1)}h` : `${(h/24).toFixed(1)}d`;
              })()}
            </span>
          </div>
        </div>
      </div>

      </>
      )}
      </div>
    </div>
  );
}
