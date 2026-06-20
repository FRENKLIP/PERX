import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, createUIMessageStream, createUIMessageStreamResponse, streamText, stepCountIs, tool, type UIMessage } from "ai";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

function getLastUserText(messages: UIMessage[]) {
  const last = [...messages].reverse().find((message) => message.role === "user");
  return (last?.parts ?? [])
    .map((part: any) => (part.type === "text" ? part.text : ""))
    .join(" ")
    .trim();
}

function cannedChatReply(input: string, variant?: "employee" | "provider") {
  const q = input.toLowerCase();
  if (variant === "provider") {
    if (q.includes("price") || q.includes("pricing") || q.includes("yoga")) {
      return "For a yoga class in Tirana, price the entry offer around 2,500-3,000 ALL per session, or 8,000-10,000 ALL for a 4-class pack. Keep the title concrete so employers understand the value fast.";
    }
    if (q.includes("idea") || q.includes("wellness")) {
      return "Try three offers: after-work yoga pack at 9,000 ALL, recovery massage at 3,500 ALL, and gym day pass plus smoothie at 2,500 ALL. Bundles usually demo best because they feel complete.";
    }
    return "For the demo, make the offer specific, easy to redeem, and rounded to the nearest 500 ALL. A clear package name plus one concrete included benefit will look strongest.";
  }

  if (q.includes("sunday") || q.includes("relax")) {
    return "For a relaxing Sunday under 8,000 ALL, pick a spa or massage benefit around 3,500 ALL, then add brunch or coffee around 2,500 ALL. You stay comfortably inside the wallet.";
  }
  if (q.includes("healthy") || q.includes("blloku")) {
    return "Healthy week in Blloku: gym or yoga around 3,000 ALL, clean lunch around 2,500 ALL, and one recovery perk if budget remains. Simple and useful.";
  }
  if (q.includes("date")) {
    return "For date night in Tirana, use a dinner benefit around 4,000 ALL and pair it with dessert, cinema, or a late coffee. Premium feel, still wallet-friendly.";
  }
  return "I’d split the wallet into one everyday perk and one treat: about 3,000 ALL for wellness or meals, then 5,000-6,000 ALL for a premium experience.";
}

function cannedStreamResponse(messages: UIMessage[], variant?: "employee" | "provider") {
  const id = crypto.randomUUID();
  const text = cannedChatReply(getLastUserText(messages), variant);
  const stream = createUIMessageStream({
    originalMessages: messages,
    execute: ({ writer }) => {
      writer.write({ type: "text-start", id });
      writer.write({ type: "text-delta", id, delta: text });
      writer.write({ type: "text-end", id });
    },
  });
  return createUIMessageStreamResponse({ stream });
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { messages, variant } = (await request.json()) as { messages: UIMessage[]; variant?: "employee" | "provider" };
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return cannedStreamResponse(messages, variant);

        const supabase = createClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_PUBLISHABLE_KEY!,
          { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
        );

        const gateway = createLovableAiGatewayProvider(key);
        const model = gateway("google/gemini-3-flash-preview");

        const employeeSystem = `You are PERX, a warm, witty AI concierge for an employee benefits marketplace in Albania.
You help employees pick tax-free benefits using their monthly wallet (typically 25,000 ALL).
Prices are always Albanian Lek (ALL). Speak in English unless user uses Albanian.
Categories: wellness, food, travel, learning, family, tech, lifestyle.
When users ask for recommendations or packages, ALWAYS call search_offers to fetch real options.
Be concise — 1-2 short sentences max, then let the offer cards do the talking. Albanian flavor welcome ("Mirëmëngjes!").`;

        const providerSystem = `You are PERX Studio AI, an assistant for benefit providers in Albania selling on PERX.
Help them: brainstorm offer ideas, suggest fair retail prices in Albanian Lek (ALL), write punchy descriptions, and analyze which categories sell best (wellness, food, travel, learning, family, tech, lifestyle).
You can call search_offers to look up comparable offers on the marketplace when discussing pricing or positioning.
Be concise — 2-4 short sentences. Concrete numbers in ALL, no fluff. Speak English unless user uses Albanian.`;

        const result = streamText({
          model,
          system: variant === "provider" ? providerSystem : employeeSystem,
          messages: await convertToModelMessages(messages),
          stopWhen: stepCountIs(50),
          tools: {
            search_offers: tool({
              description: "Search the PERX marketplace for offers. Use when the user asks for recommendations, packages, or browses by category/budget.",
              inputSchema: z.object({
                query: z.string().optional().describe("Free text search across titles/descriptions"),
                category: z.enum(["wellness", "food", "travel", "learning", "family", "tech", "lifestyle"]).optional(),
                max_price_all: z.number().optional().describe("Max price in ALL"),
                limit: z.number().optional().default(4),
              }),
              execute: async ({ query, category, max_price_all, limit }) => {
                let q = supabase.from("offers").select("id,title,description,price_all,category_slug,location,companies:provider_company_id(name)").eq("is_active", true).limit(limit ?? 4);
                if (category) q = q.eq("category_slug", category);
                if (max_price_all) q = q.lte("price_all", max_price_all);
                if (query) q = q.or(`title.ilike.%${query}%,description.ilike.%${query}%`);
                const { data, error } = await q;
                if (error) return { error: error.message, offers: [] };
                return {
                  offers: (data ?? []).map((o: any) => ({
                    id: o.id, title: o.title, description: o.description, price_all: o.price_all,
                    category: o.category_slug, location: o.location, provider: o.companies?.name,
                  })),
                };
              },
            }),
          },
        });

        return result.toUIMessageStreamResponse({ originalMessages: messages });
      },
    },
  },
});
