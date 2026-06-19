export function StatTile({ label, value, hint, accent }: { label: string; value: string; hint?: string; accent?: "ink" | "red" | "sage" | "orange" }) {
  const dot = accent === "red" ? "bg-accent-red" : accent === "sage" ? "bg-sage" : accent === "orange" ? "bg-accent-red" : "bg-ink";
  return (
    <div className="bg-white p-5 flex flex-col gap-2 min-h-[112px]">
      <div className="flex items-center gap-2">
        <span className={`size-1.5 rounded-full ${dot}`} />
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-soft">{label}</div>
      </div>
      <div className="font-serif text-3xl leading-none tracking-tight">{value}</div>
      {hint && <div className="text-[11px] text-ink-soft mt-auto">{hint}</div>}
    </div>
  );
}