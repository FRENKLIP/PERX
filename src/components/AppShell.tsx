import { Link, useRouter } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLocale, setLocale } from "@/lib/i18n";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LogOut, Languages, Home, Store, Sparkles, ShoppingBag, Inbox, BarChart3, Wrench, Heart } from "lucide-react";

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
  const roles = ctx?.roles ?? [];
  const isEmployer = roles.some((r) => r.role === "employer_admin");
  const isProvider = roles.some((r) => r.role === "provider_admin");
  const isEmployee = roles.length === 0 || roles.some((r) => r.role === "employee");
  const homeTo = isEmployer ? "/employer" : isProvider ? "/provider" : "/app";

  const initials = (profile?.full_name ?? ctx?.user?.email ?? "??").slice(0, 2).toUpperCase();

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    router.navigate({ to: "/", replace: true });
  }

  return (
    <div className="min-h-screen bg-cream text-ink font-body">
      <nav className="sticky top-0 z-50 bg-cream/85 backdrop-blur-md border-b border-border-soft">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-6">
          <Link to={homeTo as any} className="font-serif text-2xl tracking-tight">
            PERX<span className="text-accent-red">.</span>
          </Link>
          <div className="hidden md:flex items-center gap-1 text-sm">
            {isEmployee && <NavTab to="/app" label={t("home")} />}
            {isEmployee && <NavTab to="/marketplace" label={t("marketplace")} />}
            {isEmployee && <NavTab to="/concierge" label={t("concierge")} />}
            {isEmployee && <NavTab to="/saved" label="Saved" />}
            {isEmployee && <NavTab to="/cart" label={`${t("cart")}${ctx?.cartCount ? ` · ${ctx.cartCount}` : ""}`} />}
            {isEmployee && <NavTab to="/requests" label={t("requests")} />}
            {isEmployer && <NavTab to="/employer" label={t("employer_dashboard")} />}
            {isProvider && <NavTab to="/provider" label={t("provider_dashboard")} />}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setLocale(locale === "en" ? "sq" : "en"); force((n) => n + 1); }}
              className="size-9 rounded-full hairline hover:bg-paper grid place-items-center"
              title="Toggle language"
            >
              <Languages className="size-4" />
            </button>
            <div className="size-9 rounded-full bg-ink text-cream grid place-items-center font-bold text-[11px]">{initials}</div>
            <button onClick={signOut} className="size-9 rounded-full hover:bg-paper grid place-items-center" title={t("sign_out")}>
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </nav>
      <main className="pb-28 md:pb-12">{children}</main>

      {/* Mobile bottom tab bar — employees */}
      {isEmployee && (
        <div className="md:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-ink text-cream rounded-full px-2 py-2 flex items-center gap-1 shadow-xl">
          <BottomTab to="/app" icon={Home} />
          <BottomTab to="/marketplace" icon={Store} />
          <BottomTab to="/saved" icon={Heart} />
          <BottomTab to="/cart" icon={ShoppingBag} badge={ctx?.cartCount ?? 0} />
          <BottomTab to="/requests" icon={Inbox} />
        </div>
      )}
      {(isEmployer || isProvider) && (
        <div className="md:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-ink text-cream rounded-full px-2 py-2 flex items-center gap-1 shadow-xl">
          {isEmployer && <BottomTab to="/employer" icon={BarChart3} />}
          {isProvider && <BottomTab to="/provider" icon={Wrench} />}
        </div>
      )}
    </div>
  );
}

function NavTab({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to as any}
      className="px-3 py-1.5 rounded-full text-ink-soft hover:text-ink transition-colors"
      activeProps={{ className: "px-3 py-1.5 rounded-full text-ink underline underline-offset-8 decoration-accent-red decoration-2" }}
    >
      {label}
    </Link>
  );
}

function BottomTab({ to, icon: Icon, badge }: { to: string; icon: any; badge?: number }) {
  return (
    <Link to={to as any} className="relative size-11 rounded-full grid place-items-center text-cream/60 hover:text-cream" activeProps={{ className: "relative size-11 rounded-full grid place-items-center bg-cream text-ink" }}>
      <Icon className="size-4" />
      {badge && badge > 0 ? <span className="absolute -top-0.5 -right-0.5 size-4 rounded-full bg-accent-red text-[9px] font-bold grid place-items-center">{badge}</span> : null}
    </Link>
  );
}