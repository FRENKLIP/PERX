import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { generateText } from "ai";
import { z } from "zod";

const MODEL = "google/gemini-3-flash-preview";

const CATEGORY_KEYWORDS: Record<string, RegExp> = {
  wellness: /gym|fitness|spa|massage|yoga|pilates|wellness|health|sport/i,
  meals: /meal|lunch|dinner|breakfast|restaurant|cafe|coffee|food|brunch/i,
  travel: /travel|trip|hotel|weekend|hike|tour|beach|mountain|dajti|llogara|ksamil|theth/i,
  learning: /course|class|lesson|training|workshop|language|book|learn|academy/i,
};

function fallbackDescription(data: z.infer<typeof DescInput>) {
  const category = data.category?.replace(/[-_]/g, " ") || "wellness";
  const provider = data.providerName || "a trusted local provider";
  return `${data.title} gives employees a simple, enjoyable way to use their benefits with ${provider}. This ${category} experience is designed to feel easy to book, clear on what is included, and worthwhile from the first visit. It is a practical perk for teams who want everyday value without expense forms or out-of-pocket payments.`;
}

function fallbackPrice(data: z.infer<typeof PriceInput>, comps: { price_all: number }[] = []) {
  if (comps.length > 0) {
    const avg = comps.reduce((sum, item) => sum + item.price_all, 0) / comps.length;
    return Math.max(500, Math.round(avg / 500) * 500);
  }

  const text = `${data.title} ${data.category ?? ""} ${data.description ?? ""}`;
  if (/travel|hotel|weekend|tour|trip|hike/i.test(text)) return 5000;
  if (/course|training|lesson|workshop|academy/i.test(text)) return 4000;
  if (/spa|massage|premium|package/i.test(text)) return 3500;
  if (/meal|lunch|dinner|restaurant|brunch/i.test(text)) return 2500;
  return 3000;
}

function fallbackCategory(title: string, description: string | undefined, slugs: string[]) {
  const text = `${title} ${description ?? ""}`;
  for (const [slug, pattern] of Object.entries(CATEGORY_KEYWORDS)) {
    if (slugs.includes(slug) && pattern.test(text)) return { slug, confidence: 0.72 };
  }
  return { slug: slugs[0] ?? "wellness", confidence: 0.55 };
}

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
    if (!key) return { description: fallbackDescription(data) };
    const gateway = createLovableAiGatewayProvider(key);
    try {
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
    } catch {
      return { description: fallbackDescription(data) };
    }
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

    if (!key) {
      return {
        priceAll: fallbackPrice(data, comps),
        rationale: "Estimated from similar offers and local benefit pricing.",
      };
    }

    const gateway = createLovableAiGatewayProvider(key);
    try {
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
      const cleaned = text.trim().replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
      const parsed = JSON.parse(cleaned);
      const price = Math.max(100, Math.round(Number(parsed.price_all) / 500) * 500);
      return { priceAll: price, rationale: String(parsed.rationale ?? "") };
    } catch {
      return {
        priceAll: fallbackPrice(data, comps),
        rationale: "Estimated from similar offers and local benefit pricing.",
      };
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
    const { supabase } = context;
    const { data: cats } = await supabase.from("categories").select("slug, name_en");
    const slugs = (cats ?? []).map((c: any) => c.slug);

    if (!key) {
      const picked = fallbackCategory(data.title, data.description, slugs);
      return { categorySlug: picked.slug, confidence: picked.confidence };
    }

    const gateway = createLovableAiGatewayProvider(key);
    try {
      const { text } = await generateText({
        model: gateway(MODEL),
        system:
          "Pick the best category for the given offer. Respond with ONLY a JSON object like {\"slug\":\"wellness\",\"confidence\":0.9}. The slug must be one of the allowed slugs.",
        prompt: `Allowed slugs: ${slugs.join(", ")}
Title: ${data.title}
Description: ${data.description ?? "(none)"}`,
      });
      const cleaned = text.trim().replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
      const parsed = JSON.parse(cleaned);
      const slug = slugs.includes(parsed.slug) ? parsed.slug : slugs[0] ?? "wellness";
      return { categorySlug: slug, confidence: Number(parsed.confidence ?? 0.5) };
    } catch {
      const picked = fallbackCategory(data.title, data.description, slugs);
      return { categorySlug: picked.slug, confidence: picked.confidence };
    }
  });

export const generateProviderInsights = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const key = process.env.LOVABLE_API_KEY;
    const { supabase, userId } = context;

    const { data: roles } = await supabase
      .from("user_roles").select("company_id")
      .eq("user_id", userId).eq("role", "provider_admin");
    const companyIds = (roles ?? []).map((r: any) => r.company_id).filter(Boolean);
    if (companyIds.length === 0) throw new Error("No provider company");

    const cutoff = new Date(Date.now() - 30 * 86400000).toISOString();
    const [{ data: offers }, { data: items }, { data: reviews }] = await Promise.all([
      supabase.from("offers").select("id,title,price_all,category_slug,is_active").in("provider_company_id", companyIds),
      supabase.from("request_items").select("offer_title,price_all,payment_status,requests!inner(created_at)").in("provider_company_id", companyIds).gte("requests.created_at", cutoff),
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

    const fallbackInsights = () => {
      const sortedCats = [...catSummary].sort((a, b) => b.revenue - a.revenue || b.count - a.count);
      const topCategories = sortedCats.length
        ? sortedCats.slice(0, 3).map((c) => `${c.slug}: ${c.count} orders and ${c.revenue.toLocaleString()} ALL revenue`)
        : ["No paid category pattern yet", "Keep active offers clear and benefit-focused"];
      return {
        summary: paid.length
          ? `You have ${paid.length} paid orders in the last 30 days, with ${revenue.toLocaleString()} ALL in simulated revenue. Focus on the offers already getting traction and keep pricing easy to compare.`
          : "No paid orders are showing for the last 30 days yet. Keep offers active, specific, and priced clearly so employers can approve them quickly.",
        topCategories,
        pricingSuggestions: [
          "Keep entry offers around 2,500-3,500 ALL to reduce approval friction",
          "Bundle premium experiences only when the included value is obvious",
        ],
        opportunities: [
          "Add sharper descriptions for your highest-value offers",
          "Promote weekday availability to help employers use budgets consistently",
        ],
        stats: { offers: (offers ?? []).length, paid: paid.length, revenue, avgRating },
      };
    };

    if (!key) return fallbackInsights();

    const gateway = createLovableAiGatewayProvider(key);
    try {
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
      return fallbackInsights();
    }
  });
