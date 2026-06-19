import { useEffect } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { LogOut, X } from "lucide-react";
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

type Role = "employee" | "employer_admin" | "provider_admin";

type Ctx = {
  user: { email?: string | null } | null;
  profile: any;
  roles: Array<{ role: Role; company_id: string | null }>;
} | null | undefined;

export function ProfileDrawer({
  open,
  onClose,
  ctx,
  onSignOut,
}: {
  open: boolean;
  onClose: () => void;
  ctx: Ctx;
  onSignOut: () => void;
}) {
  const path = useRouterState({ select: (s) => s.location.pathname });

  // Close on route change
  useEffect(() => {
    if (open) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

  // Close on Esc
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const isEmployee =
    !ctx?.roles?.length || ctx.roles.some((r) => r.role === "employee");

  const monthStart = startOfMonthISO();
  const label = monthLabel();

  const { data } = useQuery({
    queryKey: ["passport", monthStart],
    enabled: open && isEmployee,
    queryFn: async (): Promise<PassportItem[]> => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return [];
      const { data, error } = await supabase
        .from("requests")
        .select(
          "id,created_at,status,request_items(offer_title,price_all,offers(category_slug))",
        )
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
  const empty = items.length === 0;

  const profile = ctx?.profile;
  const email = ctx?.user?.email ?? "";
  const fullName = profile?.full_name ?? email ?? "Member";
  const initials = (profile?.full_name ?? email ?? "??")
    .slice(0, 2)
    .toUpperCase();
  const roleLabel = ctx?.roles?.some((r) => r.role === "employer_admin")
    ? "Employer admin"
    : ctx?.roles?.some((r) => r.role === "provider_admin")
      ? "Provider admin"
      : "Employee";

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-[60] bg-ink/40 backdrop-blur-sm transition-opacity duration-200 ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        aria-hidden
      />
      {/* Panel */}
      <aside
        role="dialog"
        aria-modal="true"
        className={`fixed top-0 right-0 bottom-0 z-[70] w-full sm:w-[440px] bg-cream text-ink shadow-2xl overflow-y-auto transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-ink-soft">
            Profile
          </div>
          <button
            onClick={onClose}
            className="size-9 rounded-full hover:bg-paper grid place-items-center"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Identity */}
        <div className="px-6 pb-6 flex items-center gap-4">
          <div className="size-16 rounded-full bg-ink text-cream grid place-items-center font-bold text-base">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-serif text-2xl tracking-tight truncate">
              {fullName}
            </div>
            <div className="text-xs text-ink-soft truncate">{email}</div>
            <div className="mt-1.5 inline-flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-[0.18em] font-semibold hairline rounded-full px-2.5 py-0.5 bg-white text-ink-soft">
                {roleLabel}
              </span>
            </div>
          </div>
        </div>

        <div className="mx-6 border-t border-border-soft" />

        {isEmployee && (
          <>
            {/* Passport header */}
            <div className="px-6 pt-6 flex items-end justify-between gap-4">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-ink-soft mb-1">
                  Benefit Passport
                </div>
                <h2 className="font-serif text-3xl tracking-tight">{label}</h2>
              </div>
              <div className="hairline rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-ink-soft bg-white">
                {unlocked} / {PASSPORT_BUCKETS.length}
              </div>
            </div>

            {empty ? (
              <div className="m-6 hairline rounded-2xl p-8 text-center bg-white">
                <div className="text-4xl mb-2">📓</div>
                <h3 className="font-serif text-lg mb-1">A fresh passport</h3>
                <p className="text-ink-soft text-xs mb-4">
                  Approved requests this month will appear here as stamps.
                </p>
                <Link
                  to="/marketplace"
                  onClick={onClose}
                  className="inline-block bg-ink text-cream rounded-full px-5 py-2.5 text-xs font-semibold"
                >
                  Browse the marketplace
                </Link>
              </div>
            ) : (
              <>
                <div className="px-6 pt-5 grid grid-cols-2 gap-4">
                  {buckets.map((b) => (
                    <StampCard key={b.bucket} summary={b} />
                  ))}
                </div>
                {otherCount > 0 && (
                  <div className="px-6 mt-3 text-[11px] text-ink-soft">
                    + {otherCount} other benefit{otherCount === 1 ? "" : "s"} this month.
                  </div>
                )}
                <div className="m-6 hairline rounded-2xl p-5 bg-white">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-ink-soft mb-3">
                    Your month in benefits
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Stat label="Approved" value={String(items.length)} />
                    <Stat label="Spent" value={formatAll(totalSpent)} />
                    <Stat
                      label="Top category"
                      value={top && top.count > 0 ? BUCKET_META[top.bucket].label : "—"}
                    />
                    <Stat
                      label="Unlocked"
                      value={`${unlocked} of ${PASSPORT_BUCKETS.length}`}
                    />
                  </div>
                </div>
              </>
            )}
          </>
        )}

        <div className="px-6 pb-10">
          <button
            onClick={() => {
              onClose();
              onSignOut();
            }}
            className="w-full inline-flex items-center justify-center gap-2 hairline rounded-full px-5 py-3 text-sm font-semibold hover:bg-paper"
          >
            <LogOut className="size-4" /> Sign out
          </button>
        </div>
      </aside>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-soft">
        {label}
      </div>
      <div className="font-serif text-2xl mt-1 tracking-tight">{value}</div>
    </div>
  );
}