import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { supabase } from "@/integrations/supabase/client";
import { formatAll } from "@/lib/i18n";
import { downloadIcs } from "@/lib/ics";
import { ArrowLeft, CalendarPlus, CheckCircle2, MapPin, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/redeem/$requestId")({
  head: () => ({ meta: [{ title: "Redeem — PERX" }] }),
  component: RedeemPage,
  errorComponent: ({ error }) => (
    <div className="max-w-xl mx-auto px-6 pt-24 text-center">
      <h1 className="font-serif text-3xl mb-2">Could not load redemption</h1>
      <p className="text-ink-soft text-sm">{error.message}</p>
    </div>
  ),
  notFoundComponent: () => (
    <div className="max-w-xl mx-auto px-6 pt-24 text-center">
      <h1 className="font-serif text-3xl">Redemption not found</h1>
    </div>
  ),
});

function RedeemPage() {
  const { requestId } = Route.useParams();
  const qc = useQueryClient();
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ["redeem", requestId],
    queryFn: async () => {
      const { data: r, error } = await supabase
        .from("requests")
        .select("id,status,redemption_code,redeemed_at,total_all,ai_package_name,note,created_at,employee_id,request_items(id,offer_title,price_all,qty,provider_company_id,companies:provider_company_id(name,address,lat,lng,description))")
        .eq("id", requestId)
        .maybeSingle();
      if (error) throw error;
      return r;
    },
  });

  if (isLoading) {
    return <div className="max-w-2xl mx-auto px-6 pt-24 text-ink-soft text-sm">Loading…</div>;
  }
  if (!data) {
    return <div className="max-w-2xl mx-auto px-6 pt-24 font-serif text-3xl text-center">Not found.</div>;
  }
  if (data.status !== "approved") {
    return (
      <div className="max-w-xl mx-auto px-6 pt-24 text-center">
        <h1 className="font-serif text-4xl mb-3">Not approved yet</h1>
        <p className="text-ink-soft text-sm mb-8">
          Your employer needs to approve this request before you can redeem it.
        </p>
        <Link to="/requests" className="inline-block bg-ink text-cream rounded-full px-6 py-3 text-sm font-semibold">Back to requests</Link>
      </div>
    );
  }

  const items = (data as any).request_items ?? [];
  const provider = items[0]?.companies;
  const headline = data.ai_package_name || items.map((i: any) => i.offer_title).slice(0, 2).join(" + ") || "Your perk";
  const redeemed = !!data.redeemed_at;

  async function markRedeemed() {
    const { error } = await supabase.rpc("mark_request_redeemed", { p_request_id: requestId });
    if (error) { toast.error(error.message); return; }
    toast.success("Enjoy! Marked as redeemed.");
    qc.invalidateQueries({ queryKey: ["redeem", requestId] });
    qc.invalidateQueries({ queryKey: ["my-requests"] });
  }

  function addToCalendar() {
    const start = new Date();
    start.setHours(start.getHours() + 1, 0, 0, 0);
    downloadIcs({
      title: `PERX · ${headline}`,
      description: `Show code ${data.redemption_code} at ${provider?.name ?? "the venue"}.`,
      location: provider ? `${provider.name}${provider.address ? ", " + provider.address : ""}` : undefined,
      start,
      uid: data.id,
    });
  }

  return (
    <div className="max-w-3xl mx-auto px-6 pt-8 pb-24">
      <button onClick={() => router.history.back()} className="inline-flex items-center gap-2 text-xs font-semibold text-ink-soft hover:text-ink mb-6">
        <ArrowLeft className="size-3.5" /> Back
      </button>

      <div className="hairline bg-white rounded-[2rem] overflow-hidden fade-up">
        {/* Header strip */}
        <div className="bg-ink text-cream px-8 py-5 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cream/60">Approved · Ready to redeem</div>
            <div className="font-serif text-2xl mt-0.5">{headline}</div>
          </div>
          <Sparkles className="size-5 text-sage" />
        </div>

        {/* QR + code */}
        <div className="px-8 py-10 grid sm:grid-cols-[auto_1fr] gap-8 items-center border-b border-border-soft">
          <QrBlock value={`${typeof window !== "undefined" ? window.location.origin : ""}/redeem/${data.id}?c=${data.redemption_code}`} />
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-ink-soft mb-2">Show this at the counter</div>
            <div className="font-mono text-2xl font-bold tracking-[0.15em] text-accent-red">{data.redemption_code}</div>
            <div className={`inline-flex items-center gap-2 mt-5 px-3 py-1.5 rounded-full text-xs font-semibold ${redeemed ? "bg-sage/15 text-sage" : "bg-paper text-ink-soft"}`}>
              <span className={`size-2 rounded-full ${redeemed ? "bg-sage" : "bg-accent-red animate-pulse"}`} />
              {redeemed ? `Redeemed ${new Date(data.redeemed_at!).toLocaleString()}` : "Ready to redeem"}
            </div>
            <div className="flex flex-wrap gap-2 mt-6">
              <button
                onClick={markRedeemed}
                disabled={redeemed}
                className="inline-flex items-center gap-2 bg-ink text-cream rounded-full px-5 py-2.5 text-sm font-semibold disabled:opacity-40 hover:bg-accent-red transition-colors"
              >
                <CheckCircle2 className="size-4" /> Mark as redeemed
              </button>
              <button onClick={addToCalendar} className="inline-flex items-center gap-2 hairline rounded-full px-5 py-2.5 text-sm font-semibold hover:bg-paper">
                <CalendarPlus className="size-4" /> Add to calendar
              </button>
            </div>
          </div>
        </div>

        {/* Instructions */}
        {provider?.description && (
          <div className="px-8 py-6 border-b border-border-soft">
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-ink-soft mb-2">How to redeem</div>
            <p className="text-sm leading-relaxed">{provider.description}</p>
          </div>
        )}

        {/* Map */}
        {provider && (
          <div className="px-8 py-6 border-b border-border-soft">
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-ink-soft mb-3">Getting there</div>
            <div className="flex items-start gap-3 mb-4">
              <MapPin className="size-4 mt-0.5 text-accent-red shrink-0" />
              <div className="flex-1">
                <div className="font-serif text-xl">{provider.name}</div>
                {provider.address && <div className="text-sm text-ink-soft">{provider.address}</div>}
              </div>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${provider.name} ${provider.address ?? ""}`)}`}
                target="_blank" rel="noreferrer"
                className="text-xs font-semibold text-sage hover:underline shrink-0"
              >Open in Maps ↗</a>
            </div>
            {provider.lat != null && provider.lng != null && (
              <div className="h-56 rounded-2xl overflow-hidden hairline">
                <iframe
                  title="map"
                  className="w-full h-full border-0"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${provider.lng - 0.005},${provider.lat - 0.003},${provider.lng + 0.005},${provider.lat + 0.003}&layer=mapnik&marker=${provider.lat},${provider.lng}`}
                />
              </div>
            )}
          </div>
        )}

        {/* Items */}
        <div className="px-8 py-6">
          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-ink-soft mb-3">Included</div>
          <div className="space-y-1">
            {items.map((it: any) => (
              <div key={it.id} className="flex justify-between text-sm py-2 border-t border-border-soft first:border-t-0">
                <span>{it.offer_title}{it.qty > 1 && <span className="text-ink-soft"> × {it.qty}</span>}</span>
                <span className="font-semibold">{formatAll(it.price_all * it.qty)}</span>
              </div>
            ))}
            <div className="flex justify-between pt-3 border-t border-border-soft">
              <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-ink-soft self-end">Total</span>
              <span className="font-serif text-2xl">{formatAll(data.total_all)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function QrBlock({ value }: { value: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    if (!ref.current) return;
    QRCode.toCanvas(ref.current, value, { width: 220, margin: 1, color: { dark: "#171717", light: "#ffffff" } })
      .catch((e) => setErr(e.message));
  }, [value]);
  return (
    <div className="bg-white p-3 rounded-2xl hairline">
      {err ? <div className="text-xs text-accent-red w-[220px] h-[220px] grid place-items-center">{err}</div>
        : <canvas ref={ref} width={220} height={220} className="block" />}
    </div>
  );
}