import { Link } from "@tanstack/react-router";
import { formatAll, useLocale } from "@/lib/i18n";
import { Plus } from "lucide-react";
import { FavoriteButton } from "@/components/FavoriteButton";
import type { MoodId } from "./MoodPicker";
import { moodMatch } from "./MoodPicker";
import { useMemo } from "react";

type Offer = {
  id: string;
  title: string;
  title_sq?: string | null;
  description?: string | null;
  description_sq?: string | null;
  price_all: number;
  category_slug: string;
  image_url?: string | null;
  location?: string | null;
  companies?: { neighborhood?: string | null } | null;
};

export function EditorBento({ offers, onAdd, mood }: { offers: Offer[]; onAdd: (id: string) => void; mood: MoodId }) {
  const { locale } = useLocale();
  const list = useMemo(() => {
    const matched = offers.filter((o) => moodMatch(mood, o.category_slug));
    return (matched.length > 0 ? matched : offers).slice(0, 5);
  }, [offers, mood]);

  if (list.length === 0) return null;
  const [hero, ...rest] = list;

  return (
    <section>
      <div className="flex items-end justify-between mb-6">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-ink-soft mb-1">Editor's picks · {mood}</div>
          <h2 className="font-serif text-4xl">Fresh from Tirana</h2>
        </div>
        <Link to="/marketplace" className="text-sm font-semibold text-accent-red hover:underline">All offers →</Link>
      </div>

      <div className="grid md:grid-cols-3 gap-4 md:auto-rows-[220px]">
        {hero && (
          <Card o={hero} onAdd={onAdd} className="md:col-span-2 md:row-span-2" big locale={locale} />
        )}
        {rest.map((o) => (
          <Card key={o.id} o={o} onAdd={onAdd} locale={locale} />
        ))}
      </div>
    </section>
  );
}

function Card({ o, onAdd, className = "", big = false, locale }: { o: Offer; onAdd: (id: string) => void; className?: string; big?: boolean; locale: string }) {
  return (
    <article className={`group relative rounded-2xl overflow-hidden hairline bg-cream ${className}`}>
      <Link to="/offer/$offerId" params={{ offerId: o.id }} className="absolute inset-0 z-10" aria-label={o.title} />
      {o.image_url && (
        <img src={o.image_url} alt="" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/30 to-transparent" />
      <div className="absolute top-3 right-3 z-20">
        <FavoriteButton offerId={o.id} />
      </div>
      <div className="absolute inset-x-0 bottom-0 p-4 md:p-5 text-cream z-10 pointer-events-none">
        <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-cream/70">{o.category_slug} · {o.companies?.neighborhood ?? o.location}</div>
        <h3 className={`font-serif leading-tight mt-1 ${big ? "text-3xl md:text-4xl" : "text-xl"}`}>
          {locale === "sq" && o.title_sq ? o.title_sq : o.title}
        </h3>
        <div className="flex items-center justify-between mt-3 pointer-events-auto">
          <span className="font-semibold tabular-nums">{formatAll(o.price_all)}</span>
          <button
            onClick={(e) => { e.preventDefault(); onAdd(o.id); }}
            aria-label="Add to cart"
            className="size-9 rounded-full bg-cream text-ink grid place-items-center hover:bg-accent-red hover:text-cream transition-colors"
          >
            <Plus className="size-4" />
          </button>
        </div>
      </div>
    </article>
  );
}