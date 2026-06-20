import { useEffect } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { LogOut, X, Building2, MapPin, Wallet, Globe, Users, ShieldCheck, Sparkles, Coins } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatAll } from "@/lib/i18n";
import { avatarFor } from "@/lib/avatar";
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
  user: { id?: string; email?: string | null } | null;
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
  const isEmployer = !!ctx?.roles?.some((r) => r.role === "employer_admin");
  const isProvider = !!ctx?.roles?.some((r) => r.role === "provider_admin");

  // Company id derived from role assignment first, then profile fallback.
  const companyId =
    ctx?.roles?.find((r) => r.company_id)?.company_id ??
    ctx?.profile?.employer_company_id ??
    null;

  // --- Employer / org details ---
  const { data: org } = useQuery({
    queryKey: ["profile-drawer-org", companyId, isEmployer, isProvider],
    enabled: open && !!companyId,
    queryFn: async () => {
      const { data: company } = await supabase
        .from("companies")
        .select("id,name,kind,country,city,address,logo_url")
        .eq("id", companyId!)
        .maybeSingle();
      return company;
    },
  });

  // --- Employer admin team stats ---
  const monthStart = startOfMonthISO();
  const { data: teamStats } = useQuery({
    queryKey: ["profile-drawer-team", companyId, monthStart],
    enabled: open && isEmployer && !!companyId,
    queryFn: async () => {
      const [{ count: employeeCount }, { data: reqs }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("employer_company_id", companyId!),
        supabase
          .from("requests")
          .select("id,status,total_all,created_at,employee_id")
          .eq("employer_company_id", companyId!)
          .gte("created_at", monthStart),
      ]);
      const list = reqs ?? [];
      const pending = list.filter((r) => r.status === "pending").length;
      const approved = list.filter((r) => r.status === "approved");
      const committed = approved.reduce((s, r) => s + (r.total_all ?? 0), 0);
      const activeEmployees = new Set(list.map((r) => r.employee_id)).size;
      return {
        employeeCount: employeeCount ?? 0,
        pending,
        approvedCount: approved.length,
        committed,
        activeEmployees,
      };
    },
  });

  // --- Employee personal budget snapshot ---
  const { data: budget } = useQuery({
    queryKey: ["profile-drawer-budget", ctx?.user?.id, monthStart],
    enabled: open && isEmployee && !!ctx?.user?.id,
    queryFn: async () => {
      const { data: reqs } = await supabase
        .from("requests")
        .select("status,total_all,created_at")
        .eq("employee_id", ctx!.user!.id!)
        .gte("created_at", monthStart);
      const list = reqs ?? [];
      const committed = list
        .filter((r) => r.status === "approved" || r.status === "pending")
        .reduce((s, r) => s + (r.total_all ?? 0), 0);
      return { committed };
    },
  });

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
  const seed = ctx?.user?.id || email || fullName;
  const avatarUrl = avatarFor({ avatar_url: profile?.avatar_url, seed }, 160);
  const roleLabel = isEmployer ? "Employer admin" : isProvider ? "Provider admin" : "Employee";
  const RoleIcon = isEmployer ? ShieldCheck : isProvider ? Sparkles : Wallet;

  const monthlyBudget = profile?.monthly_budget_all ?? 0;
  const committedThisMonth = budget?.committed ?? 0;
  const remaining = Math.max(monthlyBudget - committedThisMonth, 0);
  const utilPct = monthlyBudget > 0 ? Math.min(100, Math.round((committedThisMonth / monthlyBudget) * 100)) : 0;
  const points = profile?.discount_points ?? 0;

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
        {/* Cover + identity */}
        <div className="relative">
          <div className="h-32 bg-gradient-to-br from-ink via-ink to-accent-red/70" />
          <button
            onClick={onClose}
            className="absolute top-4 right-4 size-9 rounded-full bg-cream/90 hover:bg-cream grid place-items-center backdrop-blur"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
          <div className="absolute top-4 left-5 text-[10px] font-semibold uppercase tracking-[0.22em] text-cream/80">
            Profile
          </div>
          <img
            src={avatarUrl}
            alt={fullName}
            className="absolute -bottom-10 left-6 size-24 rounded-full ring-4 ring-cream bg-paper object-cover"
          />
        </div>

        <div className="px-6 pt-14 pb-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="font-serif text-2xl tracking-tight truncate">{fullName}</div>
              <div className="text-xs text-ink-soft truncate">{email}</div>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] font-semibold rounded-full px-2.5 py-1 bg-ink text-cream">
              <RoleIcon className="size-3" />
              {roleLabel}
            </span>
            {org?.name && (
              <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] font-semibold hairline rounded-full px-2.5 py-1 bg-white text-ink-soft">
                <Building2 className="size-3" />
                {org.name}
              </span>
            )}
            {profile?.locale && (
              <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] font-semibold hairline rounded-full px-2.5 py-1 bg-white text-ink-soft">
                <Globe className="size-3" />
                {profile.locale}
              </span>
            )}
          </div>
        </div>

        <div className="mx-6 border-t border-border-soft" />

        {/* Employer admin block */}
        {isEmployer && (
          <div className="px-6 pt-6">
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-ink-soft mb-3">
              Your organization
            </div>
            <div className="hairline rounded-2xl bg-white p-5 flex items-center gap-4 mb-4">
              {org?.logo_url ? (
                <img src={org.logo_url} alt={org.name} className="size-12 rounded-xl object-cover bg-paper" />
              ) : (
                <div className="size-12 rounded-xl bg-ink text-cream grid place-items-center">
                  <Building2 className="size-5" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="font-serif text-lg leading-tight truncate">{org?.name ?? "Your company"}</div>
                {(org?.city || org?.country) && (
                  <div className="text-[11px] text-ink-soft mt-0.5 flex items-center gap-1">
                    <MapPin className="size-3" />
                    {[org?.city, org?.country].filter(Boolean).join(", ")}
                  </div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-2">
              <MiniStat icon={Users} label="Employees" value={String(teamStats?.employeeCount ?? "—")} />
              <MiniStat icon={Sparkles} label="Active · mo" value={String(teamStats?.activeEmployees ?? 0)} />
              <MiniStat label="Pending" value={String(teamStats?.pending ?? 0)} accent={teamStats?.pending ? "red" : undefined} />
              <MiniStat label="Committed · mo" value={formatAll(teamStats?.committed ?? 0)} />
            </div>
            <Link
              to="/employer"
              onClick={onClose}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 bg-ink text-cream rounded-full px-5 py-2.5 text-xs font-semibold"
            >
              Open employer console
            </Link>
          </div>
        )}

        {/* Provider admin block */}
        {isProvider && (
          <div className="px-6 pt-6">
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-ink-soft mb-3">
              Your studio
            </div>
            <div className="hairline rounded-2xl bg-white p-5 flex items-center gap-4">
              {org?.logo_url ? (
                <img src={org.logo_url} alt={org.name} className="size-12 rounded-xl object-cover bg-paper" />
              ) : (
                <div className="size-12 rounded-xl bg-ink text-cream grid place-items-center">
                  <Sparkles className="size-5" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="font-serif text-lg leading-tight truncate">{org?.name ?? "Your studio"}</div>
                {(org?.city || org?.country) && (
                  <div className="text-[11px] text-ink-soft mt-0.5 flex items-center gap-1">
                    <MapPin className="size-3" />
                    {[org?.city, org?.country].filter(Boolean).join(", ")}
                  </div>
                )}
              </div>
            </div>
            <Link
              to="/provider"
              onClick={onClose}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 bg-ink text-cream rounded-full px-5 py-2.5 text-xs font-semibold"
            >
              Open provider console
            </Link>
          </div>
        )}

        {/* Employee budget snapshot */}
        {isEmployee && monthlyBudget > 0 && (
          <div className="px-6 pt-6">
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-ink-soft mb-3">
              Wellbeing wallet · {label}
            </div>
            <div className="hairline rounded-2xl bg-white p-5">
              <div className="flex items-end justify-between mb-2">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.18em] text-ink-soft">Remaining</div>
                  <div className="font-serif text-3xl tracking-tight">{formatAll(remaining)}</div>
                </div>
                <div className="text-right text-[11px] text-ink-soft">
                  {formatAll(committedThisMonth)} of {formatAll(monthlyBudget)}
                </div>
              </div>
              <div className="h-2 rounded-full bg-paper overflow-hidden">
                <div
                  className="h-full bg-ink"
                  style={{ width: `${utilPct}%` }}
                />
              </div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-ink-soft mt-2">{utilPct}% used</div>
            </div>
          </div>
        )}

        {/* Employee discount points (quests credits) */}
        {isEmployee && (
          <div className="px-6 pt-6">
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-ink-soft mb-3">
              Quest credits
            </div>
            <div className="hairline rounded-2xl bg-ink text-cream p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-cream/10 grid place-items-center">
                  <Coins className="size-5" />
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.22em] text-cream/60">Balance</div>
                  <div className="font-serif text-3xl tracking-tight leading-none mt-1 tabular-nums">{points}</div>
                </div>
              </div>
              <Link
                to="/quests"
                onClick={onClose}
                className="text-[10px] font-bold uppercase tracking-[0.18em] bg-cream text-ink rounded-full px-4 py-2 hover:bg-accent-red hover:text-cream transition-colors"
              >
                Earn more
              </Link>
            </div>
            <p className="text-[11px] text-ink-soft mt-2">1 credit = 1 ALL off at checkout. Cap of 50% per request.</p>
          </div>
        )}

        {isEmployee && (
          <>
            {/* Passport header */}
            <div className="px-6 pt-8 flex items-end justify-between gap-4">
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

function MiniStat({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  icon?: any;
  accent?: "red";
}) {
  return (
    <div className="hairline rounded-2xl bg-white p-4">
      <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-soft flex items-center gap-1.5">
        {Icon && <Icon className="size-3" />} {label}
      </div>
      <div className={`font-serif text-2xl mt-1 tracking-tight ${accent === "red" ? "text-accent-red" : ""}`}>
        {value}
      </div>
    </div>
  );
}