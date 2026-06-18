export function StatTile({ label, value, hint, accent }: { label: string; value: string; hint?: string; accent?: "ink" | "red" | "sage" | "orange" }) {
  const dot = accent === "red" ? "bg-gold" : accent === "sage" ? "bg-emerald-glow" : accent === "orange" ? "bg-gold-soft" : "bg-emerald-deep";
  return (
    <div className="bg-forest p-5 flex flex-col gap-2 min-h-[112px]">
      <div className="flex items-center gap-2">
        <span className={`size-1.5 rounded-full ${dot}`} />
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-bone-soft">{label}</div>
      </div>
      <div className="font-serif text-3xl leading-none tracking-tight">{value}</div>
      {hint && <div className="text-[11px] text-bone-soft mt-auto">{hint}</div>}
    </div>
  );
}