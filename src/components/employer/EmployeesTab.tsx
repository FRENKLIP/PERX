import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatAll } from "@/lib/i18n";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { avatarFor } from "@/lib/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Pencil, Search, Check, Users } from "lucide-react";
import { EmployeeEditSheet, type EmployeeRow } from "./EmployeeEditSheet";

type SortKey = "name" | "budget" | "spent" | "util";

export function EmployeesTab({ companyIds }: { companyIds: string[] }) {
  const qc = useQueryClient();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("name");
  const [editing, setEditing] = useState<EmployeeRow | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);
  const [budgetDraft, setBudgetDraft] = useState("");
  const [bulkValue, setBulkValue] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["employer-employees", companyIds],
    enabled: companyIds.length > 0,
    queryFn: async () => {
      const [{ data: employees, error }, { data: approved }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, avatar_url, locale, monthly_budget_all, employer_company_id")
          .in("employer_company_id", companyIds)
          .order("full_name", { ascending: true }),
        supabase
          .from("requests")
          .select("employee_id, total_all, status, decided_at, created_at")
          .in("employer_company_id", companyIds)
          .eq("status", "approved"),
      ]);
      if (error) throw error;
      const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
      const spentByEmp = new Map<string, number>();
      for (const r of approved ?? []) {
        const when = new Date(r.decided_at ?? r.created_at);
        if (when >= monthStart) {
          spentByEmp.set(r.employee_id, (spentByEmp.get(r.employee_id) ?? 0) + (r.total_all ?? 0));
        }
      }
      return { employees: (employees ?? []) as EmployeeRow[], spentByEmp };
    },
  });

  const rows = useMemo(() => {
    const list = data?.employees ?? [];
    const filtered = query.trim()
      ? list.filter((e) => (e.full_name ?? "").toLowerCase().includes(query.trim().toLowerCase()))
      : list;
    const withSpent = filtered.map((e) => {
      const spent = data?.spentByEmp.get(e.id) ?? 0;
      const budget = e.monthly_budget_all ?? 0;
      const util = budget > 0 ? Math.min(1, spent / budget) : 0;
      return { ...e, spent, util };
    });
    withSpent.sort((a, b) => {
      if (sort === "name") return (a.full_name ?? "").localeCompare(b.full_name ?? "");
      if (sort === "budget") return (b.monthly_budget_all ?? 0) - (a.monthly_budget_all ?? 0);
      if (sort === "spent") return b.spent - a.spent;
      return b.util - a.util;
    });
    return withSpent;
  }, [data, query, sort]);

  async function saveBudget(id: string) {
    const next = Math.max(0, Math.round(Number(budgetDraft.replace(/[^0-9]/g, "")) || 0));
    const { error } = await supabase.from("profiles").update({ monthly_budget_all: next }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Budget updated");
    setEditingBudgetId(null);
    qc.invalidateQueries({ queryKey: ["employer-employees"] });
    qc.invalidateQueries({ queryKey: ["employer-data"] });
  }

  async function bulkSetBudget() {
    const next = Math.max(0, Math.round(Number(bulkValue.replace(/[^0-9]/g, "")) || 0));
    if (next === 0 && !confirm("Set everyone's budget to 0?")) return;
    if (rows.length === 0) return;
    setBulkBusy(true);
    const ids = rows.map((r) => r.id);
    const { error } = await supabase.from("profiles").update({ monthly_budget_all: next }).in("id", ids);
    setBulkBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Set ${formatAll(next)} for ${ids.length} employee${ids.length === 1 ? "" : "s"}`);
    setBulkValue("");
    qc.invalidateQueries({ queryKey: ["employer-employees"] });
    qc.invalidateQueries({ queryKey: ["employer-data"] });
  }

  return (
    <div className="space-y-6">
      <div className="hairline bg-white rounded-3xl p-5 flex flex-col md:flex-row md:items-center gap-3">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-ink-soft" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search employees…"
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-ink-soft">Sort</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="name">Name</option>
            <option value="budget">Budget</option>
            <option value="spent">Spent (month)</option>
            <option value="util">Utilization</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Input
            inputMode="numeric"
            placeholder="Set all to (ALL)"
            value={bulkValue}
            onChange={(e) => setBulkValue(e.target.value)}
            className="w-44"
          />
          <Button onClick={bulkSetBudget} disabled={bulkBusy || !bulkValue || rows.length === 0}>
            Apply to {rows.length}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="hairline bg-white rounded-3xl p-10 text-center text-ink-soft">Loading employees…</div>
      ) : rows.length === 0 ? (
        <div className="hairline bg-white rounded-3xl p-10 text-center text-ink-soft">
          <Users className="size-6 mx-auto mb-2 opacity-50" />
          No employees match.
        </div>
      ) : (
        <div className="hairline bg-white rounded-3xl overflow-hidden">
          <div className="grid grid-cols-12 gap-3 px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-soft border-b border-border-soft bg-paper/40">
            <div className="col-span-5">Employee</div>
            <div className="col-span-2 text-right">Monthly budget</div>
            <div className="col-span-2 text-right">Spent (this month)</div>
            <div className="col-span-2">Utilization</div>
            <div className="col-span-1 text-right">Edit</div>
          </div>
          <ul>
            {rows.map((e) => {
              const isEditing = editingBudgetId === e.id;
              const pct = Math.round(e.util * 100);
              const over = e.spent > (e.monthly_budget_all ?? 0) && (e.monthly_budget_all ?? 0) > 0;
              return (
                <li key={e.id} className="grid grid-cols-12 gap-3 px-5 py-4 items-center border-t border-border-soft first:border-t-0 hover:bg-paper/30">
                  <div className="col-span-5 flex items-center gap-3 min-w-0">
                    <Avatar className="size-9 shrink-0">
                      <AvatarImage src={avatarFor({ avatar_url: e.avatar_url, seed: e.id }, 72)} alt={e.full_name ?? ""} />
                      <AvatarFallback>{(e.full_name ?? "?").slice(0, 1).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="font-medium truncate">{e.full_name || "Unnamed"}</div>
                      <div className="text-[11px] text-ink-soft uppercase tracking-wide">{e.locale ?? "sq"}</div>
                    </div>
                  </div>
                  <div className="col-span-2 text-right">
                    {isEditing ? (
                      <form
                        onSubmit={(ev) => { ev.preventDefault(); saveBudget(e.id); }}
                        className="flex items-center gap-1 justify-end"
                      >
                        <Input
                          autoFocus
                          inputMode="numeric"
                          value={budgetDraft}
                          onChange={(ev) => setBudgetDraft(ev.target.value)}
                          className="h-8 w-24 text-right tabular-nums"
                        />
                        <Button type="submit" size="icon" variant="outline" className="h-8 w-8 shrink-0">
                          <Check className="size-3.5" />
                        </Button>
                      </form>
                    ) : (
                      <button
                        className="inline-flex items-center gap-1 tabular-nums hover:text-accent-red"
                        onClick={() => { setEditingBudgetId(e.id); setBudgetDraft(String(e.monthly_budget_all ?? 0)); }}
                        title="Edit budget"
                      >
                        {formatAll(e.monthly_budget_all ?? 0)} <Pencil className="size-3 opacity-50" />
                      </button>
                    )}
                  </div>
                  <div className="col-span-2 text-right tabular-nums text-sm">
                    {formatAll(e.spent)}
                  </div>
                  <div className="col-span-2">
                    <div className="h-2 bg-paper rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${over ? "bg-accent-red" : "bg-sage"}`}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                    <div className="text-[11px] text-ink-soft mt-1 tabular-nums">{pct}%</div>
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { setEditing(e); setSheetOpen(true); }}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <EmployeeEditSheet
        employee={editing}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ["employer-employees"] });
          qc.invalidateQueries({ queryKey: ["employer-data"] });
        }}
      />
    </div>
  );
}