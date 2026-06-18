import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatAll, useLocale } from "@/lib/i18n";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/cart")({
  head: () => ({ meta: [{ title: "Cart — Perka" }] }),
  component: Cart,
});

function Cart() {
  const { t, locale } = useLocale();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [note, setNote] = useState("");
  const [packageName, setPackageName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data } = useQuery({
    queryKey: ["cart"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const [{ data: items }, { data: profile }] = await Promise.all([
        supabase.from("cart_items").select("id, qty, offers(id,title,title_sq,price_all,category_slug,provider_company_id,companies:provider_company_id(name))").eq("user_id", u.user.id),
        supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle(),
      ]);
      return { items: items ?? [], profile, userId: u.user.id };
    },
  });

  const total = (data?.items ?? []).reduce((s: number, it: any) => s + (it.offers?.price_all ?? 0) * (it.qty ?? 1), 0);
  const budget = data?.profile?.monthly_budget_all ?? 25000;
  const employerId = data?.profile?.employer_company_id;

  async function remove(id: string) {
    await supabase.from("cart_items").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["cart"] });
    qc.invalidateQueries({ queryKey: ["app-context"] });
  }

  async function submit() {
    if (!data?.userId || !employerId) { toast.error("No employer linked to your profile"); return; }
    if ((data.items ?? []).length === 0) return;
    setSubmitting(true);
    try {
      const { data: req, error } = await supabase.from("requests").insert({
        employee_id: data.userId,
        employer_company_id: employerId,
        total_all: total,
        note,
        ai_package_name: packageName || null,
      }).select().single();
      if (error) throw error;
      const rows = (data.items as any[]).map((it) => ({
        request_id: req.id,
        offer_id: it.offers.id,
        provider_company_id: it.offers.provider_company_id,
        offer_title: it.offers.title,
        price_all: it.offers.price_all,
        qty: it.qty,
      }));
      const { error: e2 } = await supabase.from("request_items").insert(rows);
      if (e2) throw e2;
      await supabase.from("cart_items").delete().eq("user_id", data.userId);
      qc.invalidateQueries();
      toast.success("Sent to your employer for approval");
      navigate({ to: "/_authenticated/requests" });
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-6 pt-10">
      <h1 className="font-display text-4xl tracking-tight mb-2">Your selection</h1>
      <p className="text-foreground/60 text-sm mb-8">Submit when ready — your employer approves and payment is routed directly to providers.</p>

      {(data?.items ?? []).length === 0 ? (
        <div className="bg-white border border-border-soft rounded-3xl p-12 text-center">
          <p className="text-foreground/60">Your cart is empty. Browse the marketplace or ask the concierge.</p>
        </div>
      ) : (
        <div className="space-y-3 mb-6">
          {(data?.items ?? []).map((it: any) => (
            <div key={it.id} className="flex items-center bg-white border border-border-soft rounded-2xl p-4 gap-4">
              <div className="size-14 rounded-xl bg-gradient-to-br from-accent-orange/30 to-accent-red/20 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-accent-red uppercase tracking-widest">{it.offers?.category_slug}</div>
                <div className="font-display text-base truncate">{locale === "sq" && it.offers?.title_sq ? it.offers.title_sq : it.offers?.title}</div>
                <div className="text-xs text-foreground/50">{it.offers?.companies?.name}</div>
              </div>
              <div className="font-display font-extrabold">{formatAll(it.offers?.price_all ?? 0)}</div>
              <button onClick={() => remove(it.id)} className="size-8 rounded-full hover:bg-ink/5 grid place-items-center text-foreground/40 hover:text-accent-red">
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {(data?.items ?? []).length > 0 && (
        <div className="bg-ink text-cream rounded-3xl p-8">
          <div className="flex justify-between items-baseline mb-4">
            <span className="text-xs font-bold uppercase tracking-widest opacity-60">Total request</span>
            <span className="font-display text-3xl font-extrabold">{formatAll(total)}</span>
          </div>
          <div className="h-2 bg-white/15 rounded-full overflow-hidden mb-2">
            <div className="h-full bg-accent-orange" style={{ width: `${Math.min(100, (total / budget) * 100)}%` }} />
          </div>
          <p className="text-xs opacity-60 mb-6">{formatAll(total)} of {formatAll(budget)} monthly wallet</p>
          <input value={packageName} onChange={(e) => setPackageName(e.target.value)} placeholder="Optional: name this package (e.g. 'Spring wellness')" className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-sm mb-3 outline-none placeholder:text-cream/40" />
          <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note to your employer..." className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-sm mb-4 outline-none placeholder:text-cream/40" rows={2} />
          <button onClick={submit} disabled={submitting || total > budget} className="w-full bg-accent-red text-white rounded-2xl py-4 font-bold disabled:opacity-50 hover:bg-accent-orange transition-colors">
            {submitting ? "Sending..." : total > budget ? "Over budget" : t("submit_for_approval")}
          </button>
        </div>
      )}
    </div>
  );
}