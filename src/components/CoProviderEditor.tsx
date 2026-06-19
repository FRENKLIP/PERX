import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Search, X, Users } from "lucide-react";

export type CoProviderDraft = { company_id: string; name: string; share_pct: number };

export function CoProviderEditor({
  ownerCompanyId,
  ownerName,
  value,
  onChange,
}: {
  ownerCompanyId: string;
  ownerName: string;
  value: CoProviderDraft[];
  onChange: (next: CoProviderDraft[]) => void;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<{ id: string; name: string }[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (q.trim().length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("companies")
        .select("id,name")
        .eq("kind", "provider")
        .neq("id", ownerCompanyId)
        .ilike("name", `%${q.trim()}%`)
        .limit(8);
      if (!cancelled) setResults((data ?? []).filter((c) => !value.find((v) => v.company_id === c.id)));
    }, 200);
    return () => { cancelled = true; clearTimeout(t); };
  }, [q, ownerCompanyId, value]);

  const othersTotal = value.reduce((s, v) => s + (v.share_pct || 0), 0);
  const ownerShare = Math.max(0, 100 - othersTotal);
  const over = othersTotal > 100;

  function add(c: { id: string; name: string }) {
    const remaining = Math.max(0, 100 - othersTotal);
    onChange([...value, { company_id: c.id, name: c.name, share_pct: Math.min(20, remaining) }]);
    setQ("");
    setResults([]);
    setOpen(false);
  }

  function update(idx: number, share: number) {
    const next = value.slice();
    next[idx] = { ...next[idx], share_pct: Math.max(0, Math.min(100, Math.round(share || 0))) };
    onChange(next);
  }

  function remove(idx: number) {
    onChange(value.filter((_, i) => i !== idx));
  }

  return (
    <div className="sm:col-span-2">
      <div className="flex items-center gap-2 mb-2">
        <Users className="size-3.5 text-ink-soft" />
        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-soft">Co-providers (optional)</span>
      </div>
      <p className="text-xs text-ink-soft mb-3">
        Invite other provider companies to fulfill this offer. Each gets the revenue share you set; they receive an invite to accept.
      </p>

      <div className="hairline rounded-2xl bg-paper/60 divide-y divide-border-soft">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="min-w-0">
            <div className="font-semibold text-sm truncate">{ownerName}</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-ink-soft">You · Owner</div>
          </div>
          <div className={`text-sm font-semibold tabular-nums ${over ? "text-accent-red" : ""}`}>{ownerShare}%</div>
        </div>
        {value.map((v, i) => (
          <div key={v.company_id} className="flex items-center gap-3 px-4 py-3">
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm truncate">{v.name}</div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-ink-soft">Invited · pending</div>
            </div>
            <div className="flex items-center gap-1 bg-white rounded-full hairline px-2 py-1">
              <input
                type="number"
                min={0}
                max={100}
                value={v.share_pct}
                onChange={(e) => update(i, parseInt(e.target.value, 10))}
                className="w-12 bg-transparent text-right text-sm font-semibold outline-none tabular-nums"
              />
              <span className="text-xs text-ink-soft">%</span>
            </div>
            <button type="button" onClick={() => remove(i)} className="size-7 grid place-items-center rounded-full hover:bg-accent-red/10 text-ink-soft hover:text-accent-red" aria-label="Remove">
              <X className="size-3.5" />
            </button>
          </div>
        ))}
      </div>

      {over && <div className="text-xs text-accent-red mt-2">Total is over 100%. Lower a share to continue.</div>}

      <div className="relative mt-3">
        <div className="flex items-center gap-2 hairline bg-white rounded-full px-4 py-2">
          <Search className="size-3.5 text-ink-soft" />
          <input
            type="text"
            value={q}
            onChange={(e) => { setQ(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder="Search providers by name…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-ink-soft/60"
          />
          {q && <button type="button" onClick={() => { setQ(""); setResults([]); }} className="text-ink-soft hover:text-ink"><X className="size-3.5" /></button>}
        </div>
        {open && results.length > 0 && (
          <ul className="absolute z-10 left-0 right-0 mt-2 hairline bg-white rounded-2xl shadow-lg overflow-hidden">
            {results.map((c) => (
              <li key={c.id}>
                <button type="button" onClick={() => add(c)} className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-paper">
                  <span className="text-sm font-medium truncate">{c.name}</span>
                  <Plus className="size-4 text-ink-soft" />
                </button>
              </li>
            ))}
          </ul>
        )}
        {open && q.trim().length >= 2 && results.length === 0 && (
          <div className="absolute z-10 left-0 right-0 mt-2 hairline bg-white rounded-2xl px-4 py-3 text-sm text-ink-soft">No matching providers.</div>
        )}
      </div>
    </div>
  );
}

export function useCoProviderDrafts() {
  return useState<CoProviderDraft[]>([]);
}