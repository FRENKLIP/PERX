import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLocale } from "@/lib/i18n";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, MapPin } from "lucide-react";
import { Hero3DEmployee } from "@/components/home/Hero3DEmployee";
import { MoodPicker, moodMatch, type MoodId } from "@/components/home/MoodPicker";
import { ProviderMapPanel } from "@/components/home/ProviderMapPanel";
import { WeeklyMarquee } from "@/components/home/WeeklyMarquee";
import { WalletRing } from "@/components/WalletRing";

export const Route = createFileRoute("/_authenticated/app")({
  head: () => ({ meta: [{ title: "Home — PERX" }] }),
  beforeLoad: async () => {
    const { requireRole } = await import("@/lib/roles");
    await requireRole("employee");
  },
  component: AppHome,
});

function AppHome() {
  const { locale } = useLocale();
  const qc = useQueryClient();
  const [mood, setMood] = useState<MoodId>("all");

  const { data } = useQuery({
    queryKey: ["app-home"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const [{ data: profile }, { data: offers }, { data: pending }] = await Promise.all([
        supabase.from("profiles").select("full_name, monthly_budget_all").eq("id", u.user?.id ?? "").maybeSingle(),
        supabase.from("offers").select("*, companies:provider_company_id(name,neighborhood,address,lat,lng)").eq("is_active", true).order("created_at", { ascending: false }).limit(40),
        supabase.from("requests").select("total_all").eq("employee_id", u.user?.id ?? "").eq("status","pending"),
      ]);
      const spent = (pending ?? []).reduce((s,r) => s + (r.total_all ?? 0), 0);
      return {
        firstName: (profile?.full_name ?? "there").split(" ")[0],
        budget: profile?.monthly_budget_all ?? 25000,
        spent,
        offers: (offers ?? []) as any[],
      };
    },
  });

  const [weekly, setWeekly] = useState<{ theme: string; picks: any[] } | null>(null);
  useEffect(() => {
    const key = `perx_weekly_${new Date().toISOString().slice(0,10)}`;
    const cached = typeof window !== "undefined" ? localStorage.getItem(key) : null;
    if (cached) { try { setWeekly(JSON.parse(cached)); return; } catch {} }
    fetch("/api/weekly-drop").then((r) => r.json()).then((j) => {
      setWeekly(j);
      try { localStorage.setItem(key, JSON.stringify(j)); } catch {}
    }).catch(() => {});
  }, []);

  async function addToCart(offerId: string) {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase.from("cart_items").upsert({ user_id: u.user.id, offer_id: offerId, qty: 1 }, { onConflict: "user_id,offer_id" });
    if (error) toast.error(error.message);
    else { toast.success("Added to cart"); qc.invalidateQueries({ queryKey: ["app-context"] }); }
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? (locale === "sq" ? "Mirëmëngjes" : "Good morning") : hour < 18 ? (locale === "sq" ? "Mirëdita" : "Good afternoon") : (locale === "sq" ? "Mirëmbrëma" : "Good evening");

  const offers = data?.offers ?? [];
  const offersWithLatLng = offers.filter((o: any) => o.companies?.lat != null && o.companies?.lng != null);
  const daysLeft = (() => {
    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return Math.max(1, Math.ceil((+next - +now) / 86400000));
  })();

  return (
    <div className="max-w-7xl mx-auto px-6 pt-6 pb-16">
      <div className="bento">
        {/* Hero scene tile */}
        <div className="tile hover-lift col-span-12 lg:col-span-8 row-span-2 min-h-[420px] lg:min-h-[560px]">
          <Hero3DEmployee
            spent={data?.spent ?? 0}
            budget={data?.budget ?? 25000}
          />
        </div>

        {/* Greeting + CTAs */}
        <div className="tile-dark col-span-12 lg:col-span-4 p-7 md:p-8 flex flex-col justify-between min-h-[260px]">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-cream/60">
              {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
            </div>
            <h1 className="font-serif text-4xl md:text-5xl leading-[0.95] tracking-tight mt-4">
              {greeting},<br /><span className="text-sage">{data?.firstName ?? "there"}.</span>
            </h1>
          </div>
          <div className="flex flex-wrap gap-2 mt-6">
            <Link to="/marketplace" className="inline-flex items-center gap-2 border border-cream/20 text-cream px-4 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-cream/10 transition-colors">
              Browse <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>

        {/* Near you tile */}
        <div className="tile-dark col-span-12 lg:col-span-4 p-7 md:p-8 flex flex-col justify-between min-h-[260px]">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-cream/60">Near you</div>
              <div className="font-serif text-6xl md:text-7xl leading-none tracking-tight mt-3">{offersWithLatLng.length}</div>
              <div className="text-sm text-cream/60 mt-2">offers in Tirana right now</div>
            </div>
            <div className="grid place-items-center size-10 rounded-full bg-cream/10 border border-cream/10">
              <MapPin className="size-4 text-cream" />
            </div>
          </div>
          <div className="mt-6 flex items-center justify-center">
            <WalletRing daysLeft={daysLeft} dark />
          </div>
        </div>

        {/* Mood strip */}
        <div className="tile-white col-span-12 px-5 py-3">
          <MoodPicker value={mood} onChange={setMood} />
        </div>

        {/* Map panel — full width */}
        {offersWithLatLng.length > 0 && (
          <div className="tile-white col-span-12 p-6 md:p-7">
            <ProviderMapPanel
              offers={offersWithLatLng.filter((o: any) => moodMatch(mood, o.category_slug)) as any}
              onAdd={addToCart}
            />
          </div>
        )}

        {/* Weekly marquee */}
        <div className="tile-dark col-span-12 p-6 md:p-8">
          <WeeklyMarquee theme={weekly?.theme} picks={(weekly?.picks ?? []) as any} />
        </div>

      </div>
    </div>
  );
}