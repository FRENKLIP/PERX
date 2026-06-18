import { useState } from "react";
import { X, Plus } from "lucide-react";
import { formatAll } from "@/lib/i18n";

type Story = {
  id: string;
  name: string;
  hero_image_url?: string | null;
  neighborhood?: string | null;
  description?: string | null;
  offers: Array<{ id: string; title: string; price_all: number }>;
};

export function ProviderStories({ stories, onAdd }: { stories: Story[]; onAdd: (offerId: string) => void }) {
  const [open, setOpen] = useState<Story | null>(null);

  return (
    <>
      <div className="flex gap-4 overflow-x-auto pb-2 -mx-6 px-6 scrollbar-none">
        {stories.map((s) => (
          <button key={s.id} onClick={() => setOpen(s)} className="shrink-0 flex flex-col items-center gap-2 w-20 group">
            <div className="size-20 rounded-full p-[2px] bg-gradient-to-tr from-accent-red via-accent-orange to-sage group-hover:scale-105 transition-transform">
              <div className="size-full rounded-full overflow-hidden bg-paper">
                {s.hero_image_url && <img src={s.hero_image_url} alt="" className="w-full h-full object-cover" />}
              </div>
            </div>
            <span className="text-[11px] font-semibold text-ink-soft truncate w-full text-center">{s.name.split(" ")[0]}</span>
          </button>
        ))}
      </div>

      {open && (
        <div className="fixed inset-0 z-[100] bg-ink/70 backdrop-blur-sm grid place-items-center p-4 animate-in fade-in" onClick={() => setOpen(null)}>
          <div className="bg-cream rounded-3xl max-w-md w-full overflow-hidden relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setOpen(null)} className="absolute top-3 right-3 z-10 size-9 rounded-full bg-cream/80 backdrop-blur grid place-items-center hover:bg-cream"><X className="size-4" /></button>
            {open.hero_image_url && <img src={open.hero_image_url} alt="" className="w-full h-56 object-cover" />}
            <div className="p-6">
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent-red mb-1">{open.neighborhood ?? "Tirana"}</div>
              <h3 className="font-serif text-3xl leading-tight mb-2">{open.name}</h3>
              <p className="text-sm text-ink-soft mb-4">{open.description}</p>
              <div className="space-y-2">
                {open.offers.map((o) => (
                  <div key={o.id} className="flex items-center justify-between hairline rounded-2xl p-3 bg-white">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate">{o.title}</div>
                      <div className="text-xs text-ink-soft">{formatAll(o.price_all)}</div>
                    </div>
                    <button onClick={() => onAdd(o.id)} className="size-9 rounded-full bg-ink text-cream grid place-items-center hover:bg-accent-red transition-colors">
                      <Plus className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}