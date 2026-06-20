import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { generateText } from "ai";
import { z } from "zod";

const MODEL = "google/gemini-3-flash-preview";

const DescInput = z.object({
  title: z.string().min(1),
  category: z.string().optional(),
  providerName: z.string().optional(),
});

export const generateOfferDescription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => DescInput.parse(input))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");
    const gateway = createLovableAiGatewayProvider(key);
    const { text } = await generateText({
      model: gateway(MODEL),
      system:
        "You write warm, concrete marketing copy for an Albanian employee benefits marketplace (PERX). Return 60-90 words, plain paragraph, no headings, no emojis, no quotes. Focus on the experience and what's included. English only.",
      prompt: `Write a description for this offer:
Title: ${data.title}
Category: ${data.category ?? "wellness"}
Provider: ${data.providerName ?? "an Albanian provider"}`,
    });
    return { description: text.trim() };
  });

const PriceInput = z.object({
  title: z.string().min(1),
  category: z.string().optional(),
  description: z.string().optional(),
  city: z.string().optional(),
});

export const suggestOfferPrice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => PriceInput.parse(input))
  .handler(async ({ data, context }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");
    const { supabase } = context;

    let comps: { title: string; price_all: number }[] = [];
    if (data.category) {
      const { data: rows } = await supabase
        .from("offers")
        .select("title, price_all")
        .eq("category_slug", data.category)
        .eq("is_active", true)
        .limit(8);
      comps = (rows ?? []) as any;
    }

    const gateway = createLovableAiGatewayProvider(key);
    const { text } = await generateText({
      model: gateway(MODEL),
      system:
        "You suggest fair retail prices in Albanian Lek (ALL) for benefits in Tirana. Respond with ONLY a JSON object like {\"price_all\":5000,\"rationale\":\"...\"}. Round to nearest 500. No prose outside JSON.",
      prompt: `Offer:
Title: ${data.title}
Category: ${data.category ?? "wellness"}
City: ${data.city ?? "Tirana"}
Description: ${data.description ?? "(none)"}

Comparable existing offers (title, price ALL):
${comps.map((c) => `- ${c.title}: ${c.price_all}`).join("\n") || "(no comparables)"}`,
    });
    try {
      const cleaned = text.trim().replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
      const parsed = JSON.parse(cleaned);
      const price = Math.max(100, Math.round(Number(parsed.price_all) / 500) * 500);
      return { priceAll: price, rationale: String(parsed.rationale ?? "") };
    } catch {
      throw new Error("Could not parse price suggestion");
    }
  });

const CategoryInput = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
});

export const suggestOfferCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CategoryInput.parse(input))
  .handler(async ({ data, context }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");
    const { supabase } = context;
    const { data: cats } = await supabase.from("categories").select("slug, name_en");
    const slugs = (cats ?? []).map((c: any) => c.slug);

    const gateway = createLovableAiGatewayProvider(key);
    const { text } = await generateText({
      model: gateway(MODEL),
      system:
        "Pick the best category for the given offer. Respond with ONLY a JSON object like {\"slug\":\"wellness\",\"confidence\":0.9}. The slug must be one of the allowed slugs.",
      prompt: `Allowed slugs: ${slugs.join(", ")}
Title: ${data.title}
Description: ${data.description ?? "(none)"}`,
    });
    try {
      const cleaned = text.trim().replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
      const parsed = JSON.parse(cleaned);
      const slug = slugs.includes(parsed.slug) ? parsed.slug : slugs[0] ?? "wellness";
      return { categorySlug: slug, confidence: Number(parsed.confidence ?? 0.5) };
    } catch {
      throw new Error("Could not parse category suggestion");
    }
  });