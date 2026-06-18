import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, stepCountIs, tool, type UIMessage } from "ai";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { messages } = (await request.json()) as { messages: UIMessage[] };
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const supabase = createClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_PUBLISHABLE_KEY!,
          { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
        );

        const gateway = createLovableAiGatewayProvider(key);
        const model = gateway("google/gemini-3-flash-preview");

        const result = streamText({
          model,
          system: `You are Perka, a warm, witty AI concierge for an employee benefits marketplace in Albania.
You help employees pick tax-free benefits using their monthly wallet (typically 25,000 ALL).
Prices are always Albanian Lek (ALL). Speak in English unless user uses Albanian.
Categories: wellness, food, travel, learning, family, tech, lifestyle.
When users ask for recommendations or packages, ALWAYS call search_offers to fetch real options.
Be concise — 1-2 short sentences max, then let the offer cards do the talking. Albanian flavor welcome ("Mirëmëngjes!").`,
          messages: await convertToModelMessages(messages),
          stopWhen: stepCountIs(50),
          tools: {
            search_offers: tool({
              description: "Search the Perka marketplace for offers. Use when the user asks for recommendations, packages, or browses by category/budget.",
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