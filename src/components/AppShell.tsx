import { Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLocale, formatAll, setLocale } from "@/lib/i18n";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LogOut, Languages } from "lucide-react";

type Role = "employee" | "employer_admin" | "provider_admin";

export function AppShell({ children }: { children: ReactNode }) {
  const { t, locale } = useLocale();
  const router = useRouter();
  const qc = useQueryClient();
  const [, force] = useState(0);

  const { data: ctx } = useQuery({
    queryKey: ["app-context"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const [{ data: profile }, { data: roles }, { data: cartRows }, { data: pending }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle(),
        supabase.from("user_roles").select("*").eq("user_id", u.user.id),
        supabase.from("cart_items").select("offer_id, qty, offers(price_all)").eq("user_id", u.user.id),
        supabase.from("requests").select("total_all").eq("employee_id", u.user.id).eq("status", "pending"),
      ]);
      const spent = (pending ?? []).reduce((s, r) => s + (r.total_all ?? 0), 0);
      const cartCount = (cartRows ?? []).reduce((s, r) => s + (r.qty ?? 0), 0);
      return {
        user: u.user,
        profile,
        roles: (roles ?? []) as Array<{ role: Role; company_id: string | null }>,
        cartCount,
        pendingSpend: spent,
      };
    },
  });

  const profile = ctx?.profile;
  const budget = profile?.monthly_budget_all ?? 25000;
  const remaining = Math.max(0, budget - (ctx?.pendingSpend ?? 0));
  const roles = ctx?.roles ?? [];
  const isEmployer = roles.some((r) => r.role === "employer_admin");
  const isProvider = roles.some((r) => r.role === "provider_admin");

  const initials = (profile?.full_name ?? ctx?.user?.email ?? "??").slice(0, 2).toUpperCase();

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    router.navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-cream text-ink font-body">
      <nav className="sticky top-0 z-50 bg-cream/85 backdrop-blur-md border-b border-border-soft px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link to="/app" className="font-display text-xl font-extrabold tracking-tighter uppercase">
            Perka<span className="text-accent-red">.</span>
          </Link>
          <div className="hidden md:flex items-center gap-1 text-xs font-semibold">
            <NavTab to="/app" label={t("home")} />
            <NavTab to="/marketplace" label={t("marketplace")} />
            <NavTab to="/concierge" label={t("concierge")} />
            <NavTab to="/cart" label={`${t("cart")}${ctx?.cartCount ? ` (${ctx.cartCount})` : ""}`} />
            <NavTab to="/requests" label={t("requests")} />
            {isEmployer && <NavTab to="/employer" label={t("employer_dashboard")} />}
            {isProvider && <NavTab to="/provider" label={t("provider_dashboard")} />}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 bg-accent-orange/10 border border-accent-orange/20 px-3 py-1.5 rounded-full">
            <div className="size-2 bg-accent-orange rounded-full animate-pulse" />
            <span className="text-xs font-bold">{formatAll(remaining)} <span className="opacity-60 font-medium">{t("of")} {formatAll(budget)}</span></span>
          </div>
          <button
            onClick={() => { setLocale(locale === "en" ? "sq" : "en"); force((n) => n + 1); }}
            className="size-9 rounded-full bg-white border border-border-soft hover:bg-cream grid place-items-center text-xs font-bold"
            title="Toggle language"
          >
            <Languages className="size-4" />
          </button>
          <div className="size-10 rounded-full bg-ink text-cream grid place-items-center font-bold text-xs">{initials}</div>
          <button onClick={signOut} className="size-9 rounded-full hover:bg-ink/5 grid place-items-center" title={t("sign_out")}>
            <LogOut className="size-4" />
          </button>
        </div>
      </nav>
      <main className="pb-20">{children}</main>
    </div>
  );
}

function NavTab({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to as any}
      className="px-3 py-1.5 rounded-full text-foreground/60 hover:bg-ink/5 transition-colors"
      activeProps={{ className: "px-3 py-1.5 rounded-full bg-white shadow-sm text-ink" }}
    >
      {label}
    </Link>
  );
}