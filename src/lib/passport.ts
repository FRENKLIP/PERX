export type PassportBucket = "wellness" | "food" | "travel" | "learning";

export const PASSPORT_BUCKETS: PassportBucket[] = ["wellness", "food", "travel", "learning"];

export const BUCKET_META: Record<PassportBucket, { label: string; icon: string; tagline: string; accent: string }> = {
  wellness: { label: "Wellness", icon: "🌿", tagline: "Mind & body", accent: "from-sage/30 to-sage/5" },
  food:     { label: "Food",     icon: "🍷", tagline: "Tables worth booking", accent: "from-accent-red/20 to-accent-red/5" },
  travel:   { label: "Travel",   icon: "✈️", tagline: "Roads taken", accent: "from-ink/15 to-ink/5" },
  learning: { label: "Learning", icon: "📖", tagline: "Hours invested", accent: "from-paper to-cream" },
};

export function categoryToBucket(slug: string | null | undefined): PassportBucket | null {
  if (!slug) return null;
  const s = slug.toLowerCase();
  if (["wellness", "spa", "fitness", "health"].includes(s)) return "wellness";
  if (["food", "dining", "restaurant", "coffee"].includes(s)) return "food";
  if (["travel", "hotel", "transport"].includes(s)) return "travel";
  if (["learning", "education", "books", "course"].includes(s)) return "learning";
  return null;
}

export function startOfMonthISO(d = new Date()): string {
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}

export function monthLabel(d = new Date()): string {
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

export type PassportItem = {
  request_id: string;
  approved_at: string;
  offer_title: string;
  price_all: number;
  bucket: PassportBucket | null;
};

export type BucketSummary = {
  bucket: PassportBucket;
  count: number;
  spent: number;
  lastTitle: string | null;
};

export function summarize(items: PassportItem[]) {
  const byBucket = new Map<PassportBucket, BucketSummary>();
  for (const b of PASSPORT_BUCKETS) byBucket.set(b, { bucket: b, count: 0, spent: 0, lastTitle: null });
  let otherCount = 0;
  let totalSpent = 0;
  for (const it of items) {
    totalSpent += it.price_all;
    if (!it.bucket) { otherCount++; continue; }
    const s = byBucket.get(it.bucket)!;
    s.count++;
    s.spent += it.price_all;
    if (!s.lastTitle) s.lastTitle = it.offer_title;
  }
  const buckets = PASSPORT_BUCKETS.map((b) => byBucket.get(b)!);
  const unlocked = buckets.filter((b) => b.count > 0).length;
  const top = [...buckets].sort((a, b) => b.count - a.count)[0];
  return { buckets, otherCount, totalSpent, unlocked, top };
}