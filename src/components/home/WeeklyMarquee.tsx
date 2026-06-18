import { Link } from "@tanstack/react-router";
import { formatAll } from "@/lib/i18n";
import { Sparkles } from "lucide-react";

type Pick = { id: string; title: string; price_all: number; category_slug?: string; image_url?: string | null; location?: string | null; companies?: { neighborhood?: string | null } | null };

export function WeeklyMarquee({ theme, picks }: { theme?: string; picks: Pick[] }) {
  const items = (picks ?? []).slice(0, 8);
  if (items.length === 0) {
    return (
      <section className="rounded-[2rem] bg-ink text-cream p-8 md:p-10">
        <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-cream/60">PERX AI · Weekly drop</div>
        <h2 className="font-serif text-3xl md:text-4xl mt-2">Loading this week's pick…</h2>
      </section>
    );
  }
  // duplicate for seamless marquee
  const loop = [...items, ...items];
  return (
    <section className="rounded-[2rem] bg-ink text-cream p-8 md:p-10 overflow-hidden">
      <div className="flex items-end justify-between mb-6 gap-6">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-cream/60 mb-2 inline-flex items-center gap-2">
            <Sparkles className="size-3 text-accent-red" /> PERX AI · Weekly drop
          </div>
          <h2 className="font-serif text-3xl md:text-5xl leading-[1.05] max-w-2xl">{theme ?? "This week, on us."}</h2>
        </div>
      </div>
      <div className="relative -mx-10">
        <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-ink to-transparent z-10 pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-ink to-transparent z-10 pointer-events-none" />
        <div className="flex gap-4 animate-[marquee_45s_linear_infinite] hover:[animation-play-state:paused] px-10">
          {loop.map((o, i) => (
            <Link
              key={`${o.id}-${i}`}
              to="/offer/$offerId"
              params={{ offerId: o.id }}
              className="shrink-0 w-64 bg-cream/5 hover:bg-cream/10 rounded-2xl overflow-hidden group block"
            >
              <div className="aspect-[4/3] overflow-hidden">
                {o.image_url && <img src={o.image_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />}
              </div>
              <div className="p-3">
                <div className="text-[10px] uppercase tracking-widest text-cream/50">{o.category_slug}</div>
                <div className="font-serif text-lg leading-tight mt-1 line-clamp-2">{o.title}</div>
                <div className="text-xs mt-2 text-cream/70">{formatAll(o.price_all)} · {o.companies?.neighborhood ?? o.location}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}