import { BUCKET_META, type BucketSummary } from "@/lib/passport";
import { formatAll } from "@/lib/i18n";

export function StampCard({ summary }: { summary: BucketSummary }) {
  const meta = BUCKET_META[summary.bucket];
  const stamped = summary.count > 0;
  return (
    <article className={`relative hairline rounded-3xl p-6 bg-gradient-to-br ${meta.accent} overflow-hidden min-h-[220px] flex flex-col justify-between`}>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-soft">{meta.tagline}</div>
          <div className="font-serif text-3xl tracking-tight mt-1">{meta.label}</div>
        </div>
        <div className="text-4xl leading-none">{meta.icon}</div>
      </div>

      <div>
        {stamped ? (
          <>
            <div className="text-[11px] uppercase tracking-[0.18em] text-ink-soft">Last stamped</div>
            <div className="text-sm font-medium truncate">{summary.lastTitle}</div>
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="text-ink-soft">{summary.count} stamp{summary.count === 1 ? "" : "s"}</span>
              <span className="font-semibold">{formatAll(summary.spent)}</span>
            </div>
          </>
        ) : (
          <div className="text-xs italic text-ink-soft">Not yet stamped this month</div>
        )}
      </div>

      {stamped && (
        <div
          aria-hidden
          className="absolute -right-6 -bottom-6 size-32 rounded-full border-[3px] border-accent-red/70 text-accent-red font-serif uppercase tracking-[0.25em] text-[10px] grid place-items-center rotate-[-14deg] opacity-80"
        >
          <div className="text-center leading-tight">
            <div>Perx</div>
            <div className="text-[8px]">Approved</div>
          </div>
        </div>
      )}
    </article>
  );
}