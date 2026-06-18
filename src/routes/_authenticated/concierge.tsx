import { createFileRoute } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState, useEffect, useRef } from "react";
import { Sparkles, Send, Plus } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatAll } from "@/lib/i18n";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/concierge")({
  head: () => ({ meta: [{ title: "Concierge — Perka" }] }),
  component: Concierge,
});

function Concierge() {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const qc = useQueryClient();

  const { messages, sendMessage, status, addToolResult } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    onError: (e) => toast.error(e.message),
  });

  useEffect(() => { inputRef.current?.focus(); }, [status]);

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
    <div className="max-w-3xl mx-auto px-6 pt-8 pb-8 flex flex-col" style={{ minHeight: "calc(100vh - 80px)" }}>
      <div className="mb-4">
        <h1 className="font-display text-3xl tracking-tight flex items-center gap-2">
          <Sparkles className="size-6 text-accent-red" /> Perka concierge
        </h1>
        <p className="text-sm text-foreground/60">Tell me what you'd love — a relaxing weekend, a healthy lunch routine, a course you've meant to take. I'll find it in your wallet.</p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-5 mb-4">
        {messages.length === 0 && (
          <div className="grid sm:grid-cols-2 gap-3 mt-8">
            {[
              "Find me something relaxing under 8000 ALL",
              "Build a wellness package for the week",
              "What's good for a date night in Tirana?",
              "I want to learn something new this month",
            ].map((s) => (
              <button key={s} onClick={() => { setInput(s); }}
                className="text-left bg-white border border-border-soft rounded-2xl p-4 hover:border-accent-red transition-colors text-sm">
                {s}
              </button>
            ))}
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={m.role === "user" ? "flex justify-end" : ""}>
            <div className={m.role === "user" ? "bg-ink text-cream rounded-2xl px-5 py-3 max-w-[80%]" : "max-w-[90%]"}>
              {m.parts.map((p, i) => {
                if (p.type === "text") return <div key={i} className="text-sm leading-relaxed whitespace-pre-wrap">{p.text}</div>;
                if (p.type.startsWith("tool-")) {
                  const tp: any = p;
                  if (tp.state !== "output-available") {
                    return <div key={i} className="text-xs text-foreground/40 mt-2 italic">Searching...</div>;
                  }
                  const output = tp.output;
                  if (output?.offers) {
                    return (
                      <div key={i} className="grid sm:grid-cols-2 gap-3 mt-3">
                        {output.offers.map((o: any) => (
                          <div key={o.id} className="bg-white border border-border-soft rounded-2xl p-4">
                            <div className="text-[10px] font-bold text-accent-red uppercase mb-1">{o.category}</div>
                            <div className="font-display text-base mb-1">{o.title}</div>
                            <div className="text-xs text-foreground/50 mb-3">{o.provider}</div>
                            <div className="flex justify-between items-center">
                              <span className="font-bold">{formatAll(o.price_all)}</span>
                              <button onClick={() => handleAddToCart(o.id)} className="size-8 rounded-full bg-cream border border-border-soft hover:bg-accent-red hover:text-white hover:border-accent-red grid place-items-center">
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
          <div className="text-sm text-foreground/40 italic">Thinking...</div>
        )}
      </div>

      <div className="bg-white border border-border-soft rounded-3xl p-3 flex items-end gap-2 sticky bottom-4">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
          placeholder="Ask Perka..."
          className="flex-1 resize-none px-3 py-2.5 outline-none text-sm bg-transparent max-h-32"
          rows={1}
        />
        <button onClick={submit} disabled={!input.trim() || status === "submitted" || status === "streaming"} className="size-11 bg-ink text-cream rounded-2xl grid place-items-center disabled:opacity-40 shrink-0">
          <Send className="size-4" />
        </button>
      </div>
    </div>
  );
}