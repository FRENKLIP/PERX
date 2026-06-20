import { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { MessageCircle, X, Send, Plus, Sparkles, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatAll } from "@/lib/i18n";
import { toast } from "sonner";

type Variant = "employee" | "provider";
type LocalMessage = {
  id: string;
  role: "user" | "assistant";
  parts: Array<{ type: "text"; text: string }>;
};

const GREETINGS: Record<Variant, { title: string; subtitle: string; prompts: string[] }> = {
  employee: {
    title: "PERX Concierge",
    subtitle: "AI · this session only",
    prompts: [
      "Relaxing Sunday under 8,000 ALL",
      "Healthy week in Blloku",
      "Date night in Tirana",
    ],
  },
  provider: {
    title: "PERX Studio AI",
    subtitle: "Pricing & growth · this session only",
    prompts: [
      "How should I price a yoga class in Tirana?",
      "Give me 3 offer ideas for wellness",
      "Which categories sell best on PERX?",
    ],
  },
};

const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

function cannedReply(input: string, variant: Variant) {
  const q = input.toLowerCase();

  if (variant === "provider") {
    if (q.includes("price") || q.includes("pricing") || q.includes("yoga")) {
      return "For a yoga class in Tirana, price the entry offer around 2,500-3,000 ALL per session, or 8,000-10,000 ALL for a 4-class pack. Keep the title concrete, like “After-work yoga pack”, so employers understand the value fast.";
    }
    if (q.includes("idea") || q.includes("wellness")) {
      return "Try these three demo offers: after-work yoga pack at 9,000 ALL, recovery massage at 3,500 ALL, and gym day pass plus smoothie at 2,500 ALL. The strongest one for PERX is usually the bundle because it feels like a complete benefit.";
    }
    if (q.includes("sell") || q.includes("category") || q.includes("best")) {
      return "Wellness and meals are the easiest categories to sell because employees can use them every month. Travel works better as a premium perk, especially when it is packaged as a weekend experience under 6,000 ALL.";
    }
    return "For the demo, I’d make the offer specific, easy to redeem, and rounded to the nearest 500 ALL. A strong listing has a clear package name, one concrete included benefit, and a price employers can approve without extra questions.";
  }

  if (q.includes("sunday") || q.includes("relax")) {
    return "For a relaxing Sunday under 8,000 ALL, I’d pick a spa or massage benefit around 3,500 ALL, then add a calm brunch or coffee stop around 2,500 ALL. You still stay comfortably inside the wallet.";
  }
  if (q.includes("healthy") || q.includes("blloku")) {
    return "Healthy week in Blloku: start with a gym or yoga pass around 3,000 ALL, add a clean lunch benefit around 2,500 ALL, and keep one wellness slot free for recovery. Simple, useful, and easy to repeat.";
  }
  if (q.includes("date") || q.includes("night")) {
    return "For date night in Tirana, use a dinner benefit around 4,000 ALL and pair it with a small experience like dessert, cinema, or a late coffee. It feels premium without burning the whole monthly wallet.";
  }
  if (q.includes("travel") || q.includes("weekend")) {
    return "For a weekend-style perk, I’d choose a guided hike or hotel-day package around 5,000-6,000 ALL. Travel benefits work best when the package clearly says what is included.";
  }
  return "I’d split the wallet into one everyday perk and one treat: about 3,000 ALL for wellness or meals, then 5,000-6,000 ALL for a premium experience. That makes the benefit feel useful now and still leaves room for choice.";
}

export function ConciergeBubble({ variant = "employee" }: { variant?: Variant } = {}) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [status, setStatus] = useState<"ready" | "submitted">("ready");
  const qc = useQueryClient();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open, status]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function submit() {
    const text = input.trim();
    if (!text || status === "submitted") return;
    setMessages((current) => [
      ...current,
      { id: crypto.randomUUID(), role: "user", parts: [{ type: "text", text }] },
    ]);
    setInput("");
    setStatus("submitted");
    await sleep(650);
    setMessages((current) => [
      ...current,
      { id: crypto.randomUUID(), role: "assistant", parts: [{ type: "text", text: cannedReply(text, variant) }] },
    ]);
    setStatus("ready");
  }

  function newChat() {
    setMessages([]);
    setInput("");
    setStatus("ready");
  }

  async function addToCart(offerId: string) {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase
      .from("cart_items")
      .upsert({ user_id: u.user.id, offer_id: offerId, qty: 1 }, { onConflict: "user_id,offer_id" });
    if (error) toast.error(error.message);
    else {
      toast.success("Added to cart");
      qc.invalidateQueries({ queryKey: ["app-context"] });
    }
  }

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-24 md:bottom-6 right-6 z-[60] size-14 rounded-full bg-ink text-cream shadow-xl grid place-items-center hover:bg-accent-red transition-colors"
          aria-label="Open AI concierge"
        >
          <MessageCircle className="size-6" />
          <span className="absolute -top-1 -right-1 size-4 rounded-full bg-accent-red grid place-items-center">
            <Sparkles className="size-2.5 text-cream" />
          </span>
        </button>
      )}

      {open && (
        <div className="fixed bottom-24 md:bottom-6 right-6 z-[60] w-[calc(100vw-3rem)] sm:w-[380px] h-[560px] max-h-[80vh] bg-cream rounded-3xl shadow-2xl border border-border-soft flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border-soft bg-cream">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-full bg-ink text-cream grid place-items-center">
                <Sparkles className="size-4" />
              </div>
              <div>
                <div className="font-serif text-base leading-tight">{GREETINGS[variant].title}</div>
                <div className="text-[10px] text-ink-soft">{GREETINGS[variant].subtitle}</div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={newChat} className="size-8 rounded-full hover:bg-paper grid place-items-center" title="New chat">
                <RotateCcw className="size-4" />
              </button>
              <button onClick={() => setOpen(false)} className="size-8 rounded-full hover:bg-paper grid place-items-center" title="Close">
                <X className="size-4" />
              </button>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {messages.length === 0 && (
              <div className="space-y-3">
                <p className="font-serif text-xl leading-snug">{variant === "provider" ? "How can I help your business today?" : "What are you in the mood for?"}</p>
                <div className="grid gap-2">
                  {GREETINGS[variant].prompts.map((s) => (
                    <button key={s} onClick={() => setInput(s)}
                      className="text-left text-sm bg-sage/40 hover:bg-sage/60 rounded-2xl px-3 py-2 transition-colors">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m) => (
              <div key={m.id} className={m.role === "user" ? "flex justify-end" : ""}>
                <div className={m.role === "user"
                  ? "bg-ink text-cream rounded-2xl rounded-br-sm px-3 py-2 max-w-[85%] text-sm"
                  : "max-w-full"}>
                  {m.parts.map((p, i) => {
                    if (p.type === "text") return (
                      <div key={i} className={m.role === "user" ? "whitespace-pre-wrap" : "text-sm whitespace-pre-wrap"}>{p.text}</div>
                    );
                    if (p.type.startsWith("tool-")) {
                      const tp: any = p;
                      if (tp.state !== "output-available")
                        return <div key={i} className="text-xs text-ink-soft italic mt-1">Searching…</div>;
                      const out = tp.output;
                      if (out?.offers) {
                        return (
                          <div key={i} className="grid gap-2 mt-2">
                            {out.offers.map((o: any) => (
                              <div key={o.id} className="hairline bg-white rounded-2xl p-3">
                                <div className="text-[9px] font-semibold text-accent-red uppercase tracking-[0.18em]">{o.category}</div>
                                <div className="font-serif text-sm leading-tight">{o.title}</div>
                                <div className="text-[10px] text-ink-soft">{o.provider} · {o.location}</div>
                                <div className="flex justify-between items-center mt-2">
                                  <span className="font-semibold text-sm">{formatAll(o.price_all)}</span>
                                  <button onClick={() => addToCart(o.id)}
                                    className="size-7 rounded-full hairline grid place-items-center hover:bg-ink hover:text-cream transition-colors">
                                    <Plus className="size-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      }
                    }
                    return null;
                  })}
                </div>
              </div>
            ))}
            {status === "submitted" && (
              <div className="text-xs text-ink-soft italic">Thinking…</div>
            )}
          </div>

          <div className="border-t border-border-soft p-3 flex items-end gap-2 bg-cream">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
              placeholder="Ask anything…"
              rows={1}
              className="flex-1 resize-none px-3 py-2 outline-none text-sm bg-paper rounded-2xl max-h-24"
            />
            <button onClick={submit}
              disabled={!input.trim() || status === "submitted"}
              className="size-10 bg-ink text-cream rounded-full grid place-items-center disabled:opacity-40 shrink-0 hover:bg-accent-red transition-colors">
              <Send className="size-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
