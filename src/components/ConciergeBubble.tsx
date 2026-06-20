import { useState, useEffect, useRef } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useQueryClient } from "@tanstack/react-query";
import { MessageCircle, X, Send, Plus, Sparkles, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatAll } from "@/lib/i18n";
import { toast } from "sonner";

type Variant = "employee" | "provider";

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

export function ConciergeBubble({ variant = "employee" }: { variant?: Variant } = {}) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [chatId, setChatId] = useState(() => crypto.randomUUID());
  const qc = useQueryClient();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status, setMessages } = useChat({
    id: chatId,
    transport: new DefaultChatTransport({ api: "/api/chat", body: { variant } }),
    onError: (e) => toast.error(e.message),
  });

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open, status]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  function submit() {
    if (!input.trim() || status === "submitted" || status === "streaming") return;
    sendMessage({ text: input.trim() });
    setInput("");
  }

  function newChat() {
    setMessages([]);
    setChatId(crypto.randomUUID());
    setInput("");
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
            {(status === "submitted" || status === "streaming") && (
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
              disabled={!input.trim() || status === "submitted" || status === "streaming"}
              className="size-10 bg-ink text-cream rounded-full grid place-items-center disabled:opacity-40 shrink-0 hover:bg-accent-red transition-colors">
              <Send className="size-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}