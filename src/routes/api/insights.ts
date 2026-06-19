import { createFileRoute } from "@tanstack/react-router";
import { generateText, Output } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { rollupRequests, type CategoryRollup } from "@/lib/categorize";

const CATEGORY_ENUM = ["wellness", "travel", "learning", "food", "other"] as const;

const InsightSchema = z.object({
  headline: z.string().describe("One punchy sentence in the form: 'Your team is not asking for X. They are choosing Y.' Use plain English, no hedging."),
  recommendations: z.array(z.object({
    category: z.enum(CATEGORY_ENUM),
    action: z.string().describe("A concrete next step the employer can take next month, max 12 words."),
    rationale: z.string().describe("One short clause grounded in an observed share or count."),
  })).min(2).max(3),
});

type Body = {
  items?: Array<{ offer_title: string; price_all: number }>;
  period_days?: number;
  approved_count?: number;
};

export const Route = createFileRoute("/api/insights")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as Body;
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing key", { status: 500 });

        const items = body.items ?? [];
        const approvedCount = body.approved_count ?? items.length;
        const period = body.period_days ?? 30;

        if (approvedCount < 3) {
          return Response.json({
            headline: "Not enough signal yet — approve a few more requests to unlock Talent Edge.",
            recommendations: [],
          });
        }

        const rollup: CategoryRollup[] = rollupRequests(items);

        const gateway = createLovableAiGatewayProvider(key);
        const model = gateway("google/gemini-3-flash-preview");

        const { experimental_output } = await generateText({
          model,
          system: [
            "You are 'Talent Edge', an HR analyst for an employer in Tirana, Albania.",
            "Voice: confident, comparative, plain English. No bullets, no hedging, no emoji.",
            "Headline MUST contrast what the team is NOT asking for vs what they ARE choosing.",
            "Every recommendation must reference an observed category share, count, or example.",
            "Currency context is Albanian Lek (ALL). Keep numbers out of the headline.",
          ].join(" "),
          prompt: [
            `Period: last ${period} days. Approved requests: ${approvedCount}.`,
            "Category mix (already aggregated):",
            JSON.stringify(rollup, null, 2),
            "Write the Talent Edge insight.",
          ].join("\n\n"),
          experimental_output: Output.object({ schema: InsightSchema }),
        });

        return Response.json(experimental_output);
      },
    },
  },
});