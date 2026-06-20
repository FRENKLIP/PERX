import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export function PolicyTab({ companyId }: { companyId: string }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["employer-policy", companyId],
    queryFn: async () => {
      const [{ data: coRows }, { data: cats }] = await Promise.all([
        supabase.rpc("get_company_policy", { p_company_id: companyId } as any),
        supabase.from("categories").select("slug, name_en").order("name_en"),
      ]);
      const co = Array.isArray(coRows) ? (coRows[0] ?? null) : coRows;
      return { company: co as any, categories: cats ?? [] };
    },
  });

  const [maxAmt, setMaxAmt] = useState<string>("");
  const [autoBelow, setAutoBelow] = useState<string>("");
  const [defaultBudget, setDefaultBudget] = useState<string>("");
  const [allowed, setAllowed] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    if (!data?.company) return;
    setMaxAmt(data.company.policy_max_request_all ? String(data.company.policy_max_request_all) : "");
    setAutoBelow(data.company.policy_auto_approve_below_all ? String(data.company.policy_auto_approve_below_all) : "");
    setDefaultBudget(String(data.company.policy_default_monthly_budget_all ?? 25000));
    setAllowed(data.company.policy_allowed_categories ?? []);
  }, [data?.company?.id]);

  function toggleCat(slug: string) {
    setAllowed((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]));
  }

  async function save() {
    setSaving(true);
    const patch = {
      policy_max_request_all: maxAmt ? parseInt(maxAmt, 10) : null,
      policy_auto_approve_below_all: autoBelow ? parseInt(autoBelow, 10) : null,
      policy_default_monthly_budget_all: defaultBudget ? parseInt(defaultBudget, 10) : 25000,
      policy_allowed_categories: allowed.length > 0 ? allowed : null,
    };
    const { error } = await supabase.from("companies").update(patch).eq("id", companyId);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Policy saved");
    qc.invalidateQueries({ queryKey: ["employer-policy", companyId] });
  }

  async function applyDefaultToAll() {
    if (!confirm(`Set every employee's monthly budget to ${defaultBudget} ALL? This overwrites current values.`)) return;
    setApplying(true);
    const { error } = await supabase
      .from("profiles")
      .update({ monthly_budget_all: parseInt(defaultBudget, 10) })
      .eq("employer_company_id", companyId);
    setApplying(false);
    if (error) return toast.error(error.message);
    toast.success("Applied to all employees");
    qc.invalidateQueries({ queryKey: ["employer-data"] });
  }

  if (isLoading) return <div className="text-ink-soft text-sm">Loading policy…</div>;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Spending limits */}
      <section className="hairline bg-white rounded-3xl p-6 fade-up">
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-soft">Spending limits</div>
        <h3 className="font-serif text-2xl mt-1 mb-4">Caps & auto-approval</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <NumField
            label="Max per request (ALL)"
            value={maxAmt}
            onChange={setMaxAmt}
            hint="Leave empty for no cap."
            placeholder="No cap"
          />
          <NumField
            label="Auto-approve below (ALL)"
            value={autoBelow}
            onChange={setAutoBelow}
            hint="Requests at or under this amount skip manual review."
            placeholder="Off"
          />
        </div>
      </section>

      {/* Allowed categories */}
      <section className="hairline bg-white rounded-3xl p-6 fade-up">
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-soft">Allowed categories</div>
        <h3 className="font-serif text-2xl mt-1 mb-1">What employees can spend on</h3>
        <p className="text-xs text-ink-soft mb-4">Leave all unchecked to allow every category.</p>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2">
          {(data?.categories ?? []).map((c: any) => {
            const active = allowed.includes(c.slug);
            return (
              <button
                key={c.slug}
                type="button"
                onClick={() => toggleCat(c.slug)}
                className={`px-4 py-2 rounded-2xl text-sm font-semibold text-left transition-colors ${active ? "bg-ink text-cream" : "hairline bg-paper hover:bg-white"}`}
              >
                {c.name_en}
              </button>
            );
          })}
        </div>
      </section>

      {/* Employee defaults */}
      <section className="hairline bg-white rounded-3xl p-6 fade-up">
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-soft">Employee defaults</div>
        <h3 className="font-serif text-2xl mt-1 mb-4">Monthly budget</h3>
        <div className="grid sm:grid-cols-2 gap-4 items-end">
          <NumField
            label="Default monthly budget (ALL)"
            value={defaultBudget}
            onChange={setDefaultBudget}
            hint="Used for new employees and Reset to default."
            placeholder="25000"
          />
          <button
            type="button"
            onClick={applyDefaultToAll}
            disabled={applying || !defaultBudget}
            className="px-5 py-3 rounded-full hairline text-sm font-semibold hover:bg-paper inline-flex items-center gap-2 disabled:opacity-50"
          >
            {applying && <Loader2 className="size-4 animate-spin" />}
            Apply default to all employees
          </button>
        </div>
      </section>

      <div className="sticky bottom-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="px-6 py-3 rounded-full bg-ink text-cream font-semibold text-sm hover:bg-accent-red transition-colors disabled:opacity-60 inline-flex items-center gap-2 shadow-lg"
        >
          {saving && <Loader2 className="size-4 animate-spin" />}
          {saving ? "Saving…" : "Save policy"}
        </button>
      </div>
    </div>
  );
}

function NumField({ label, value, onChange, hint, placeholder }: { label: string; value: string; onChange: (v: string) => void; hint?: string; placeholder?: string }) {
  return (
    <label className="block">
      <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-soft mb-2 block">{label}</span>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-paper rounded-2xl px-4 py-3 outline-none"
      />
      {hint && <span className="text-xs text-ink-soft mt-1 block">{hint}</span>}
    </label>
  );
}