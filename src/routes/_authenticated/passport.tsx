import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatAll } from "@/lib/i18n";
import {
  BUCKET_META,
  PASSPORT_BUCKETS,
  categoryToBucket,
  monthLabel,
  startOfMonthISO,
  summarize,
  type PassportItem,
} from "@/lib/passport";
import { StampCard } from "@/components/passport/StampCard";

export const Route = createFileRoute("/_authenticated/passport")({
  head: () => ({ meta: [{ title: "Benefit Passport — PERX" }] }),
  beforeLoad: async () => {
    const { requireRole } = await import("@/lib/roles");
    await requireRole("employee");
  },
  component: PassportPage,
});

function PassportPage() {
  const monthStart = startOfMonthISO();
  const label = monthLabel();

  const { data, isLoading } = useQuery({
    queryKey: ["passport", monthStart],
    queryFn: async (): Promise<PassportItem[]> => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return [];
      const { data, error } = await supabase
        .from("requests")
        .select("id,created_at,status,request_items(offer_title,price_all,offers(category_slug))")
        .eq("employee_id", u.user.id)
        .eq("status", "approved")
        .gte("created_at", monthStart)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const items: PassportItem[] = [];
      for (const r of data ?? []) {
        for (const it of (r as any).request_items ?? []) {
          items.push({
            request_id: r.id,
            approved_at: r.created_at,
            offer_title: it.offer_title,
            price_all: it.price_all,
            bucket: categoryToBucket(it.offers?.category_slug),
          });
        }
      }
      return items;
    },
  });

  const items = data ?? [];
  const { buckets, otherCount, totalSpent, unlocked, top } = summarize(items);
  const empty = !isLoading && items.length === 0;

  return (
    <div className="max-w-5xl mx-auto px-6 pt-10">
      <header className="fade-up mb-10 flex items-end justify-between gap-6 flex-wrap">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-soft mb-2">
            Benefit Passport
          </div>
          <h1 className="font-serif text-5xl tracking-tight">{label}</h1>
          <p className="text-ink-soft mt-3 max-w-md">
            A stamp for every approved benefit, sorted by what it means for you.
          </p>
        </div>
        <div className="hairline rounded-full px-5 py-2 text-xs uppercase tracking-[0.2em] text-ink-soft bg-white">
          {unlocked} / {PASSPORT_BUCKETS.length} unlocked
        </div>
      </header>

      {empty ? (
        <div className="hairline rounded-3xl p-16 text-center bg-white">
          <div className="text-5xl mb-3">📓</div>
          <h2 className="font-serif text-2xl mb-2">A fresh passport</h2>
          <p className="text-ink-soft text-sm mb-6">
            Approved requests this month will appear here as stamps.
          </p>
          <Link to="/marketplace" className="inline-block bg-ink text-cream rounded-full px-6 py-3 text-sm font-semibold">
            Browse the marketplace
          </Link>
        </div>
      ) : (
        <>
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-5 fade-up">
            {buckets.map((b) => <StampCard key={b.bucket} summary={b} />)}
          </section>

          {otherCount > 0 && (
            <div className="mt-4 text-xs text-ink-soft">
              + {otherCount} other benefit{otherCount === 1 ? "" : "s"} this month outside the four core stamps.
            </div>
          )}

          <section className="mt-12 hairline rounded-3xl p-8 bg-white fade-up">
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-ink-soft mb-4">
              Your month in benefits
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <Stat label="Approved" value={String(items.length)} />
              <Stat label="Spent" value={formatAll(totalSpent)} />
              <Stat label="Top category" value={top && top.count > 0 ? BUCKET_META[top.bucket].label : "—"} />
              <Stat label="Unlocked" value={`${unlocked} of ${PASSPORT_BUCKETS.length}`} />
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-soft">{label}</div>
      <div className="font-serif text-3xl mt-1 tracking-tight">{value}</div>
    </div>
  );
}