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

export const generateProviderInsights = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");
    const { supabase, userId } = context;

    const { data: roles } = await supabase
      .from("user_roles").select("company_id")
      .eq("user_id", userId).eq("role", "provider_admin");
    const companyIds = (roles ?? []).map((r: any) => r.company_id).filter(Boolean);
    if (companyIds.length === 0) throw new Error("No provider company");

    const cutoff = new Date(Date.now() - 30 * 86400000).toISOString();
    const [{ data: offers }, { data: items }, { data: reviews }] = await Promise.all([
      supabase.from("offers").select("id,title,price_all,category_slug,is_active").in("provider_company_id", companyIds),
      supabase.from("request_items").select("offer_title,price_all,payment_status,created_at").in("provider_company_id", companyIds).gte("created_at", cutoff),
      supabase.from("offer_reviews").select("rating,comment,offer_id").in("offer_id", ((await supabase.from("offers").select("id").in("provider_company_id", companyIds)).data ?? []).map((o: any) => o.id)).limit(20),
    ]);

    const paid = (items ?? []).filter((i: any) => i.payment_status === "simulated_paid");
    const revenue = paid.reduce((s: number, i: any) => s + (i.price_all ?? 0), 0);
    const byCat = new Map<string, { count: number; revenue: number }>();
    for (const o of offers ?? []) {
      byCat.set(o.category_slug, byCat.get(o.category_slug) ?? { count: 0, revenue: 0 });
    }
    for (const it of paid) {
      const offer = (offers ?? []).find((o: any) => o.title === it.offer_title);
      if (offer) {
        const cur = byCat.get(offer.category_slug) ?? { count: 0, revenue: 0 };
        cur.count += 1; cur.revenue += it.price_all ?? 0;
        byCat.set(offer.category_slug, cur);
      }
    }
    const catSummary = Array.from(byCat.entries()).map(([slug, v]) => ({ slug, ...v }));
    const avgRating = (reviews ?? []).length
      ? Math.round((reviews ?? []).reduce((s: number, r: any) => s + r.rating, 0) / (reviews ?? []).length * 10) / 10
      : null;

    const gateway = createLovableAiGatewayProvider(key);
    const { text } = await generateText({
      model: gateway(MODEL),
      system:
        "You are a growth analyst for an Albanian benefits marketplace provider. Reply with ONLY a JSON object: {\"summary\":\"...\",\"topCategories\":[\"...\"],\"pricingSuggestions\":[\"...\"],\"opportunities\":[\"...\"]}. Each array has 2-3 short, concrete items. Use ALL for amounts. No prose outside JSON.",
      prompt: `Past 30 days for this provider:
Offers: ${(offers ?? []).length} (${(offers ?? []).filter((o: any) => o.is_active !== false).length} active)
Paid orders: ${paid.length}
Revenue: ${revenue} ALL
Category breakdown: ${JSON.stringify(catSummary)}
Avg rating: ${avgRating ?? "n/a"}
Top selling titles: ${paid.slice(0, 5).map((p: any) => p.offer_title).join(" | ") || "(none)"}

Write actionable, concrete advice. Don't restate numbers verbatim — interpret them.`,
    });
    try {
      const cleaned = text.trim().replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
      const parsed = JSON.parse(cleaned);
      return {
        summary: String(parsed.summary ?? ""),
        topCategories: (parsed.topCategories ?? []).map(String).slice(0, 4),
        pricingSuggestions: (parsed.pricingSuggestions ?? []).map(String).slice(0, 4),
        opportunities: (parsed.opportunities ?? []).map(String).slice(0, 4),
        stats: { offers: (offers ?? []).length, paid: paid.length, revenue, avgRating },
      };
    } catch {
      throw new Error("Could not parse insights");
    }
  });