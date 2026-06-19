export type CategoryKey = "wellness" | "travel" | "learning" | "food" | "other";

export const CATEGORY_LABELS: Record<CategoryKey, string> = {
  wellness: "Wellness & recovery",
  travel: "Travel & weekends",
  learning: "Learning & growth",
  food: "Meals & dining",
  other: "Other",
};

export const CATEGORY_ICONS: Record<CategoryKey, string> = {
  wellness: "🌿",
  travel: "✈️",
  learning: "📖",
  food: "🍷",
  other: "✨",
};

const PATTERNS: Array<[CategoryKey, RegExp]> = [
  ["wellness", /(gym|yoga|spa|pool|sauna|pilates|massage|fitness|recovery|wellness|hammam)/i],
  ["travel",   /(ksamil|theth|dajti|dhërmi|dhermi|llogara|trip|hotel|getaway|weekend|flight|airbnb|travel)/i],
  ["learning", /(coding|language|coolab|destil|course|class|workshop|book|learn|certificate)/i],
  ["food",     /(restaurant|dinner|lunch|brunch|coffee|cafe|tavern|wine|bakery|food|menu|tasting)/i],
];

export function categorizeTitle(title: string): CategoryKey {
  for (const [key, re] of PATTERNS) if (re.test(title)) return key;
  return "other";
}

export type CategoryRollup = {
  category: CategoryKey;
  label: string;
  count: number;
  spent: number;
  share_pct: number;
  examples: string[];
};

export function rollupRequests(
  items: Array<{ offer_title: string; price_all: number }>,
): CategoryRollup[] {
  const map = new Map<CategoryKey, { count: number; spent: number; examples: Set<string> }>();
  let totalSpent = 0;
  for (const it of items) {
    const k = categorizeTitle(it.offer_title || "");
    const cur = map.get(k) ?? { count: 0, spent: 0, examples: new Set<string>() };
    cur.count += 1;
    cur.spent += it.price_all || 0;
    if (cur.examples.size < 3 && it.offer_title) cur.examples.add(it.offer_title);
    map.set(k, cur);
    totalSpent += it.price_all || 0;
  }
  return Array.from(map.entries())
    .map(([category, v]) => ({
      category,
      label: CATEGORY_LABELS[category],
      count: v.count,
      spent: v.spent,
      share_pct: totalSpent ? Math.round((v.spent / totalSpent) * 100) : 0,
      examples: Array.from(v.examples),
    }))
    .sort((a, b) => b.spent - a.spent);
}