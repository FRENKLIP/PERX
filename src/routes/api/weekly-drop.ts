import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

function weekNumber(d: Date) {
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.floor((d.getTime() - yearStart.getTime()) / (7 * 86400000));
}

const themes = [
  "Slow week — book a sauna, eat slowly, walk farther.",
  "Make Friday count — dinner with someone, music after.",
  "Move first, think later. Sweat hard, eat well.",
  "Soft reset — quiet morning, hot lunch, early to bed.",
  "Get out of Tirana — even just for a day.",
  "Learn something with your hands this week.",
];

export const Route = createFileRoute("/api/weekly-drop")({
  server: {
    handlers: {
      GET: async () => {
        const supabase = createClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_PUBLISHABLE_KEY!,
          { auth: { persistSession: false, autoRefreshToken: false } },
        );
        const week = weekNumber(new Date());
        const cats = ["wellness", "food", "travel", "learning"];
        const rotation = [cats[week % 4], cats[(week + 1) % 4], cats[(week + 2) % 4]];
        const picks: any[] = [];
        for (const c of rotation) {
          const { data } = await supabase.from("offers")
            .select("id,title,price_all,category_slug,image_url,location,companies:provider_company_id(name,neighborhood)")
            .eq("category_slug", c).eq("is_active", true);
          if (data && data.length) {
            picks.push(data[week % data.length]);
          }
        }
        return Response.json({
          theme: themes[week % themes.length],
          week,
          picks,
        });
      },
    },
  },
});