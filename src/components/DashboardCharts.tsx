import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell, BarChart, Bar } from "recharts";
import { formatAll } from "@/lib/i18n";

const PALETTE = ["#171717", "#c5503a", "#7a8b6f", "#d98b5f", "#9c8fb8", "#5c8aa8"];

export function TrendArea({ data, color = "#171717", height = 220 }: { data: { date: string; value: number }[]; color?: string; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="trend-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.18} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#8a8a8a" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
        <YAxis tick={{ fontSize: 10, fill: "#8a8a8a" }} axisLine={false} tickLine={false} width={40} tickFormatter={(v) => v >= 1000 ? `${Math.round(v/1000)}k` : `${v}`} />
        <Tooltip
          cursor={{ stroke: color, strokeOpacity: 0.15 }}
          contentStyle={{ background: "#fff", border: "1px solid #e6e1d8", borderRadius: 12, fontSize: 12, padding: "8px 12px" }}
          formatter={(v: any) => [formatAll(Number(v)), "Total"]}
        />
        <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill="url(#trend-grad)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function CategoryDonut({ data, height = 220 }: { data: { name: string; value: number }[]; height?: number }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="flex items-center gap-4">
      <div className="relative" style={{ width: height, height }}>
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie data={data} dataKey="value" innerRadius="62%" outerRadius="92%" stroke="none" paddingAngle={2}>
              {data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
            </Pie>
            <Tooltip
              contentStyle={{ background: "#fff", border: "1px solid #e6e1d8", borderRadius: 12, fontSize: 12, padding: "8px 12px" }}
              formatter={(v: any, n: any) => [formatAll(Number(v)), n]}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 grid place-items-center text-center pointer-events-none">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-bone-soft">Total</div>
            <div className="font-serif text-2xl leading-none mt-1">{formatAll(total)}</div>
          </div>
        </div>
      </div>
      <ul className="flex-1 space-y-2 min-w-0">
        {data.map((d, i) => (
          <li key={d.name} className="flex items-center gap-2 text-sm">
            <span className="size-2.5 rounded-sm shrink-0" style={{ background: PALETTE[i % PALETTE.length] }} />
            <span className="flex-1 truncate capitalize">{d.name}</span>
            <span className="text-bone-soft text-xs tabular-nums">{total ? Math.round((d.value / total) * 100) : 0}%</span>
          </li>
        ))}
        {data.length === 0 && <li className="text-sm text-bone-soft">No data yet.</li>}
      </ul>
    </div>
  );
}

export function TopBars({ data, color = "#171717", height = 220 }: { data: { name: string; value: number }[]; color?: string; height?: number }) {
  if (data.length === 0) return <div className="grid place-items-center text-sm text-bone-soft" style={{ height }}>No data yet.</div>;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#171717" }} axisLine={false} tickLine={false} width={130} />
        <Tooltip
          cursor={{ fill: "#17171708" }}
          contentStyle={{ background: "#fff", border: "1px solid #e6e1d8", borderRadius: 12, fontSize: 12, padding: "8px 12px" }}
          formatter={(v: any) => [formatAll(Number(v)), "Total"]}
        />
        <Bar dataKey="value" radius={[0, 6, 6, 0]} fill={color} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function PeriodSwitcher({ value, onChange }: { value: 7 | 30 | 90; onChange: (v: 7 | 30 | 90) => void }) {
  return (
    <div className="hairline rounded-full p-1 bg-obsidian inline-flex">
      {[7, 30, 90].map((d) => (
        <button
          key={d}
          onClick={() => onChange(d as 7 | 30 | 90)}
          className={`px-3.5 py-1.5 rounded-full text-[11px] font-semibold transition-colors ${value === d ? "bg-emerald-deep text-bone" : "text-bone-soft hover:text-bone"}`}
        >
          {d}d
        </button>
      ))}
    </div>
  );
}

export function trendBuckets(rows: { date: string | Date; value: number }[], days: number) {
  const buckets = new Map<string, number>();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    buckets.set(d.toISOString().slice(0, 10), 0);
  }
  rows.forEach((r) => {
    const key = new Date(r.date).toISOString().slice(0, 10);
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + r.value);
  });
  return Array.from(buckets.entries()).map(([k, v]) => ({
    date: new Date(k).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    value: v,
  }));
}