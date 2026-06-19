import { createFileRoute } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState, useEffect, useRef } from "react";
import { Send, Plus, Sparkles } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatAll } from "@/lib/i18n";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/concierge")({
  head: () => ({ meta: [{ title: "Concierge — PERX" }] }),
  beforeLoad: async () => {
    const { requireRole } = await import("@/lib/roles");
    await requireRole("employee");
  },
  component: Concierge,
});

function Concierge() {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const qc = useQueryClient();

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    onError: (e) => toast.error(e.message),
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, [status]);
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages]);

  async function handleAddToCart(offerId: string) {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase.from("cart_items").upsert({ user_id: u.user.id, offer_id: offerId, qty: 1 }, { onConflict: "user_id,offer_id" });
    if (error) toast.error(error.message);
    else { toast.success("Added to cart"); qc.invalidateQueries({ queryKey: ["app-context"] }); }
  }

  function submit() {
    if (!input.trim() || status === "submitted" || status === "streaming") return;
    sendMessage({ text: input.trim() });
    setInput("");
  }

  return (
    <div className="max-w-2xl mx-auto px-6 pt-16 pb-32 md:pb-12 flex flex-col" style={{ minHeight: "calc(100vh - 96px)" }}>
      <header className="mb-8 fade-up">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-soft mb-2 flex items-center gap-2"><Sparkles className="size-3.5 text-accent-red" /> AI concierge</div>
        <h1 className="font-serif text-6xl md:text-7xl tracking-tight leading-tight">What are you in the mood for?</h1>
        <p className="text-ink-soft mt-4 max-w-xl text-lg md:text-xl">Describe a craving — a slow weekend, a date night, a course you've been postponing — and I'll match it to your wallet.</p>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-6 mb-6 -mx-2 px-2">
        {messages.length === 0 && (
          <div className="grid sm:grid-cols-2 gap-3 mt-2">
            {[
              "A relaxing Sunday under 8,000 ALL",
              "Build a healthy week in Blloku",
              "Where for a date night in Tirana?",
              "I want a weekend out of the city",
            ].map((s) => (
              <button key={s} onClick={() => setInput(s)}
                className="text-left hairline rounded-2xl p-6 hover:bg-paper transition-colors font-display text-lg font-medium leading-relaxed">
                {s}
              </button>
            ))}
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={m.role === "user" ? "flex justify-end" : ""}>
            <div className={m.role === "user" ? "bg-ink text-cream rounded-2xl rounded-br-sm px-5 py-3 max-w-[80%]" : "max-w-full"}>
              {m.parts.map((p, i) => {
                if (p.type === "text") return <div key={i} className={m.role === "user" ? "text-sm leading-relaxed whitespace-pre-wrap" : "text-base font-serif leading-relaxed whitespace-pre-wrap"}>{p.text}</div>;
                if (p.type.startsWith("tool-")) {
                  const tp: any = p;
                  if (tp.state !== "output-available") return <div key={i} className="text-xs text-ink-soft mt-2 italic">Searching Tirana…</div>;
                  const output = tp.output;
                  if (output?.offers) {
                    return (
                      <div key={i} className="grid sm:grid-cols-2 gap-3 mt-4">
                        {output.offers.map((o: any) => (
                          <div key={o.id} className="hairline bg-white rounded-2xl p-4">
                            <div className="text-[10px] font-semibold text-accent-red uppercase tracking-[0.18em] mb-1">{o.category}</div>
                            <div className="font-serif text-lg leading-tight mb-1">{o.title}</div>
                            <div className="text-xs text-ink-soft mb-3">{o.provider} · {o.location}</div>
                            <div className="flex justify-between items-center">
                              <span className="font-semibold">{formatAll(o.price_all)}</span>
                              <button onClick={() => handleAddToCart(o.id)} className="size-8 rounded-full hairline grid place-items-center hover:bg-ink hover:text-cream hover:border-ink transition-colors">
                                <Plus className="size-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  }
                  return null;
                }
                return null;
              })}
            </div>
          </div>
        ))}
        {(status === "submitted" || status === "streaming") && (
          <div className="text-sm text-ink-soft italic">Thinking…</div>
        )}
      </div>

      <div className="sticky bottom-20 md:bottom-4 bg-cream/90 backdrop-blur-md hairline rounded-3xl p-3 flex items-end gap-2">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
          placeholder="Ask anything…"
          className="flex-1 resize-none px-3 py-3.5 outline-none text-base bg-transparent max-h-32"
          rows={1}
        />
        <button onClick={submit} disabled={!input.trim() || status === "submitted" || status === "streaming"} className="size-12 bg-ink text-cream rounded-full grid place-items-center disabled:opacity-40 shrink-0 hover:bg-accent-red transition-colors">
          <Send className="size-4" />
        </button>
      </div>
    </div>
  );
}