import { createFileRoute } from "@tanstack/react-router";
import { generateText } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

export const Route = createFileRoute("/api/insights")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.json();
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing key", { status: 500 });

        const gateway = createLovableAiGatewayProvider(key);
        const model = gateway("google/gemini-3-flash-preview");

        const { text } = await generateText({
          model,
          system: "You are an HR analyst writing for an employer in Tirana, Albania. Write a punchy 3-sentence summary of what their team values, then a single bulleted recommendation list (3 items). Use Albanian Lek (ALL) and be concrete.",
          prompt: `Here are recent benefit requests from our team. Summarize what they're choosing and recommend what to add next month.\n\n${JSON.stringify(body.requests ?? [], null, 2)}`,
        });

        return Response.json({ text });
      },
    },
  },
});