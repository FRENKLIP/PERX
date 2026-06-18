import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLocale } from "@/lib/i18n";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { Hero3DEmployee } from "@/components/home/Hero3DEmployee";
import { MoodPicker, type MoodId } from "@/components/home/MoodPicker";
import { WalletSim } from "@/components/home/WalletSim";
import { ProviderMapPanel } from "@/components/home/ProviderMapPanel";
import { WeeklyMarquee } from "@/components/home/WeeklyMarquee";
import { EditorBento } from "@/components/home/EditorBento";

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

  return (
    <div className="max-w-7xl mx-auto px-6 pt-6 pb-16 space-y-10">
      <Hero3DEmployee
        greeting={greeting}
        firstName={data?.firstName ?? "there"}
        spent={data?.spent ?? 0}
        budget={data?.budget ?? 25000}
        offersNear={offersWithLatLng.length}
      />

      <div className="sticky top-[64px] z-30 -mx-6 px-6 py-3 bg-cream/85 backdrop-blur border-y border-border-soft">
        <MoodPicker value={mood} onChange={setMood} />
      </div>

      <WalletSim
        offers={offers as any}
        budget={data?.budget ?? 25000}
        spent={data?.spent ?? 0}
        mood={mood}
      />

      {offersWithLatLng.length > 0 && (
        <ProviderMapPanel offers={offersWithLatLng as any} onAdd={addToCart} />
      )}

      <WeeklyMarquee theme={weekly?.theme} picks={(weekly?.picks ?? []) as any} />

      <EditorBento offers={offers as any} onAdd={addToCart} mood={mood} />
    </div>
  );
}