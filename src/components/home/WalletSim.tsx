import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatAll } from "@/lib/i18n";
import { toast } from "sonner";
import { Plus, X, Send, RotateCcw } from "lucide-react";
import type { MoodId } from "./MoodPicker";
import { moodMatch } from "./MoodPicker";

type Offer = { id: string; title: string; price_all: number; category_slug?: string | null; image_url?: string | null };

export function WalletSim({
  offers,
  budget,
  spent,
  mood,
}: {
  offers: Offer[];
  budget: number;
  spent: number;
  mood: MoodId;
}) {
  const [picks, setPicks] = useState<Offer[]>([]);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const filtered = useMemo(() => offers.filter((o) => moodMatch(mood, o.category_slug)).slice(0, 12), [offers, mood]);
  const simTotal = picks.reduce((s, o) => s + (o.price_all ?? 0), 0);
  const remaining = Math.max(0, budget - spent - simTotal);
  const pctUsed = budget > 0 ? Math.min(1, (spent + simTotal) / budget) : 0;
  const over = spent + simTotal > budget;

  function add(o: Offer) {
    if (picks.some((p) => p.id === o.id)) return;
    setPicks((p) => [...p, o]);
  }
  function remove(id: string) {
    setPicks((p) => p.filter((x) => x.id !== id));
  }

  async function sendToCart() {
    if (picks.length === 0) return;
    setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setBusy(false); return; }
    const rows = picks.map((p) => ({ user_id: u.user!.id, offer_id: p.id, qty: 1 }));
    const { error } = await supabase.from("cart_items").upsert(rows, { onConflict: "user_id,offer_id" });
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success(`${picks.length} added to cart`);
      setPicks([]);
    }
  }

  const size = 200;
  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;

  return (
    <section className="rounded-[2rem] hairline bg-ink text-cream p-6 md:p-8 overflow-hidden">
      <div className="flex items-end justify-between mb-6">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-cream/50 mb-2">Live wallet simulator</div>
          <h2 className="font-serif text-3xl md:text-4xl leading-tight">Drag, drop, see what fits.</h2>
        </div>
        <div className="hidden md:block text-[11px] text-cream/50 max-w-xs text-right">
          Tap or drag chips into the basket. Nothing's charged until you send for approval.
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        {/* Basket + ring */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const id = e.dataTransfer.getData("text/offer-id");
            const o = filtered.find((x) => x.id === id);
            if (o) add(o);
          }}
          className={`lg:col-span-5 rounded-2xl border-2 border-dashed p-5 transition-all ${dragOver ? "border-accent-red bg-cream/10" : "border-cream/20 bg-cream/5"}`}
        >
          <div className="flex items-center gap-5">
            <div className="relative" style={{ width: size, height: size }}>
              <svg width={size} height={size} className="-rotate-90">
                <circle cx={size/2} cy={size/2} r={r} stroke="rgba(250,247,242,0.15)" strokeWidth={stroke} fill="none" />
                <circle cx={size/2} cy={size/2} r={r} stroke={over ? "#c5503a" : "#7a8b6f"} strokeWidth={stroke} fill="none" strokeLinecap="round"
                  strokeDasharray={c} strokeDashoffset={c * (1 - pctUsed)}
                  style={{ transition: "stroke-dashoffset 0.6s cubic-bezier(.2,.7,.2,1), stroke 0.3s" }} />
              </svg>
              <div className="absolute inset-0 grid place-items-center text-center">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-cream/50">{over ? "Over budget" : "Would be left"}</div>
                  <div className="font-serif text-3xl mt-1">{formatAll(remaining)}</div>
                  <div className="text-[11px] text-cream/50 mt-1">of {formatAll(budget)}</div>
                </div>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-cream/50 mb-2">In basket · {picks.length}</div>
              {picks.length === 0 ? (
                <div className="text-sm text-cream/60 italic">Drop offers here →</div>
              ) : (
                <ul className="space-y-1.5 max-h-40 overflow-auto pr-1">
                  {picks.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-2 bg-cream/5 rounded-lg px-3 py-1.5">
                      <span className="truncate text-sm">{p.title}</span>
                      <span className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-cream/70 tabular-nums">{formatAll(p.price_all)}</span>
                        <button onClick={() => remove(p.id)} className="size-6 grid place-items-center rounded-full hover:bg-cream/10"><X className="size-3" /></button>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <div className="flex gap-2 mt-5">
            <button
              onClick={sendToCart}
              disabled={busy || picks.length === 0}
              className="flex-1 inline-flex items-center justify-center gap-2 bg-accent-red text-cream px-4 py-2.5 rounded-full text-sm font-semibold disabled:opacity-40 hover:bg-cream hover:text-ink transition-colors"
            >
              <Send className="size-4" /> Send to cart
            </button>
            <button
              onClick={() => setPicks([])}
              disabled={picks.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold border border-cream/20 disabled:opacity-30 hover:bg-cream/10"
            >
              <RotateCcw className="size-4" />
            </button>
          </div>
        </div>

        {/* Draggable chips */}
        <div className="lg:col-span-7">
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-cream/50 mb-3">Try a mix · {filtered.length} matching {mood}</div>
          <div className="grid sm:grid-cols-2 gap-2 max-h-[360px] overflow-auto pr-1">
            {filtered.map((o) => {
              const inBasket = picks.some((p) => p.id === o.id);
              return (
                <div
                  key={o.id}
                  draggable={!inBasket}
                  onDragStart={(e) => e.dataTransfer.setData("text/offer-id", o.id)}
                  className={`group flex items-center gap-3 rounded-xl bg-cream/5 hover:bg-cream/10 p-2.5 transition-colors ${inBasket ? "opacity-40" : "cursor-grab active:cursor-grabbing"}`}
                >
                  {o.image_url ? (
                    <img src={o.image_url} alt="" className="size-12 rounded-lg object-cover shrink-0" draggable={false} />
                  ) : (
                    <div className="size-12 rounded-lg bg-cream/10 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-cream/40">{o.category_slug ?? "perk"}</div>
                    <div className="text-sm truncate">{o.title}</div>
                    <div className="text-[11px] text-cream/60 tabular-nums">{formatAll(o.price_all)}</div>
                  </div>
                  <button
                    onClick={() => add(o)}
                    disabled={inBasket}
                    aria-label="Add"
                    className="size-8 grid place-items-center rounded-full border border-cream/20 hover:bg-cream hover:text-ink transition-colors shrink-0 disabled:opacity-30"
                  >
                    <Plus className="size-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}