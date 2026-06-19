import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatAll, useLocale } from "@/lib/i18n";
import { FavoriteButton } from "@/components/FavoriteButton";
import { useState, useRef, useEffect } from "react";
import { Plus, FolderInput, MoreHorizontal, Check, X } from "lucide-react";
import { toast } from "sonner";

const STARTERS = [
  { name: "Weekend", emoji: "🌿" },
  { name: "Healthy week", emoji: "🥗" },
  { name: "Date night", emoji: "🍷" },
  { name: "Next month", emoji: "📅" },
];

export const Route = createFileRoute("/_authenticated/saved")({
  head: () => ({ meta: [{ title: "Saved — PERX" }] }),
  beforeLoad: async () => {
    const { requireRole } = await import("@/lib/roles");
    await requireRole("employee");
  },
  component: Saved,
});

function Saved() {
  const { locale } = useLocale();
  const qc = useQueryClient();
  const [activeCol, setActiveCol] = useState<string | "all">("all");
  const [newName, setNewName] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [moveFor, setMoveFor] = useState<string | null>(null);

  const { data: collections } = useQuery({
    queryKey: ["saved-collections"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return [];
      const { data } = await supabase
        .from("saved_collections")
        .select("id,name,emoji,sort_order")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      return data ?? [];
    },
  });

  const { data } = useQuery({
    queryKey: ["saved-offers", activeCol],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return [];
      let q = supabase
        .from("favorites")
        .select("offer_id, created_at, collection_id, offers:offer_id(id,title,title_sq,image_url,price_all,category_slug,location,companies:provider_company_id(name,neighborhood))")
        .eq("user_id", u.user.id)
        .order("created_at", { ascending: false });
      if (activeCol !== "all") q = q.eq("collection_id", activeCol);
      const { data } = await q;
      return (data ?? []).filter((r: any) => r.offers);
    },
  });

  async function createCollection(name: string, emoji?: string) {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return null;
    const { data, error } = await supabase
      .from("saved_collections")
      .insert({ user_id: u.user.id, name, emoji: emoji ?? null, sort_order: collections?.length ?? 0 })
      .select("id").single();
    if (error) { toast.error(error.message); return null; }
    qc.invalidateQueries({ queryKey: ["saved-collections"] });
    return data.id as string;
  }

  async function renameCollection(id: string, name: string) {
    const { error } = await supabase.from("saved_collections").update({ name }).eq("id", id);
    if (error) toast.error(error.message);
    else qc.invalidateQueries({ queryKey: ["saved-collections"] });
  }

  async function deleteCollection(id: string) {
    if (!confirm("Delete this collection? Saved offers in it stay saved.")) return;
    const { error } = await supabase.from("saved_collections").delete().eq("id", id);
    if (error) return toast.error(error.message);
    if (activeCol === id) setActiveCol("all");
    qc.invalidateQueries({ queryKey: ["saved-collections"] });
    qc.invalidateQueries({ queryKey: ["saved-offers"] });
  }

  async function moveOffer(offerId: string, collectionId: string | null) {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase
      .from("favorites")
      .update({ collection_id: collectionId })
      .eq("user_id", u.user.id)
      .eq("offer_id", offerId);
    if (error) return toast.error(error.message);
    toast.success(collectionId ? "Moved" : "Removed from collection");
    setMoveFor(null);
    qc.invalidateQueries({ queryKey: ["saved-offers"] });
  }

  return (
    <div className="max-w-7xl mx-auto px-6 pt-10">
      <div className="fade-up mb-10">
        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-soft mb-2">Saved</div>
        <h1 className="font-serif text-5xl tracking-tight">{(data?.length ?? 0)} kept for later.</h1>
      </div>

      {/* Collection switcher */}
      <div className="flex flex-wrap gap-2 mb-8 fade-up">
        <CollectionPill active={activeCol === "all"} onClick={() => setActiveCol("all")}>All</CollectionPill>
        {(collections ?? []).map((c: any) => (
          <div key={c.id} className="relative">
            <CollectionPill active={activeCol === c.id} onClick={() => setActiveCol(c.id)}>
              {c.emoji && <span className="mr-1">{c.emoji}</span>}{c.name}
              <button
                onClick={(e) => { e.stopPropagation(); setMenuFor(menuFor === c.id ? null : c.id); }}
                className="ml-1 -mr-1 size-5 grid place-items-center rounded-full hover:bg-ink/10"
                aria-label="More"
              >
                <MoreHorizontal className="size-3" />
              </button>
            </CollectionPill>
            {menuFor === c.id && (
              <div className="absolute z-20 top-full left-0 mt-2 bg-white hairline rounded-2xl shadow-lg overflow-hidden min-w-[160px]">
                <button
                  onClick={async () => {
                    const n = prompt("Rename collection", c.name);
                    if (n?.trim()) await renameCollection(c.id, n.trim());
                    setMenuFor(null);
                  }}
                  className="block w-full text-left px-4 py-2 text-sm hover:bg-paper"
                >Rename</button>
                <button
                  onClick={() => { deleteCollection(c.id); setMenuFor(null); }}
                  className="block w-full text-left px-4 py-2 text-sm text-accent-red hover:bg-accent-red/10"
                >Delete</button>
              </div>
            )}
          </div>
        ))}
        {showNew ? (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!newName.trim()) return;
              const id = await createCollection(newName.trim());
              setNewName(""); setShowNew(false);
              if (id) setActiveCol(id);
            }}
            className="flex items-center gap-1 hairline bg-white rounded-full pl-3 pr-1 py-1"
          >
            <input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Name…" className="bg-transparent text-sm outline-none w-32" />
            <button type="submit" className="size-7 grid place-items-center rounded-full bg-ink text-cream"><Check className="size-3.5" /></button>
            <button type="button" onClick={() => { setShowNew(false); setNewName(""); }} className="size-7 grid place-items-center rounded-full hover:bg-paper"><X className="size-3.5" /></button>
          </form>
        ) : (
          <button onClick={() => setShowNew(true)} className="inline-flex items-center gap-1 px-4 py-2 rounded-full hairline text-sm font-semibold hover:bg-paper">
            <Plus className="size-3.5" /> New
          </button>
        )}
      </div>

      {(collections?.length ?? 0) === 0 && (
        <div className="mb-8 fade-up">
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-soft mb-2">Suggested collections</div>
          <div className="flex flex-wrap gap-2">
            {STARTERS.map((s) => (
              <button
                key={s.name}
                onClick={async () => { const id = await createCollection(s.name, s.emoji); if (id) setActiveCol(id); }}
                className="inline-flex items-center gap-1 px-4 py-2 rounded-full hairline text-sm bg-white/60 hover:bg-white"
              >
                <span>{s.emoji}</span> {s.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {(data?.length ?? 0) === 0 ? (
        <div className="hairline rounded-3xl p-16 text-center">
          <p className="font-serif text-2xl mb-3">{activeCol === "all" ? "Nothing saved yet." : "Nothing in this collection yet."}</p>
          <p className="text-ink-soft text-sm mb-6">{activeCol === "all" ? "Tap the heart on any offer to keep it here." : "Move saved offers here from All."}</p>
          <Link to="/marketplace" className="inline-block bg-ink text-cream rounded-full px-6 py-3 text-sm font-semibold hover:bg-accent-red">Browse marketplace</Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {(data ?? []).map((r: any) => {
            const o = r.offers;
            return (
              <article key={o.id} className="group fade-up">
                <div className="relative">
                  <Link to="/offer/$offerId" params={{ offerId: o.id }} className="block">
                    <div className="relative aspect-[4/5] rounded-2xl overflow-hidden hairline mb-3">
                    {o.image_url && <img src={o.image_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" loading="lazy" />}
                    <div className="absolute top-3 right-3 flex flex-col gap-2">
                      <FavoriteButton offerId={o.id} />
                      <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMoveFor(moveFor === o.id ? null : o.id); }}
                        className="size-9 rounded-full hairline grid place-items-center bg-white/90 backdrop-blur hover:bg-white"
                        aria-label="Move to collection"
                      >
                        <FolderInput className="size-4 text-ink" />
                      </button>
                    </div>
                  </div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-accent-red">{o.category_slug} · {o.companies?.neighborhood ?? o.location}</div>
                    <h3 className="font-serif text-xl leading-tight mt-1 group-hover:text-accent-red transition-colors">{locale === "sq" && o.title_sq ? o.title_sq : o.title}</h3>
                    <div className="text-xs text-ink-soft mt-1">{o.companies?.name}</div>
                    <div className="font-semibold mt-2">{formatAll(o.price_all)}</div>
                  </Link>
                  {moveFor === o.id && (
                    <MoveMenu
                      collections={collections ?? []}
                      currentCollectionId={r.collection_id}
                      onMove={(cid) => moveOffer(o.id, cid)}
                      onCreate={async (name) => {
                        const id = await createCollection(name);
                        if (id) await moveOffer(o.id, id);
                      }}
                      onClose={() => setMoveFor(null)}
                    />
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CollectionPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold transition-colors ${active ? "bg-ink text-cream" : "hairline bg-white hover:bg-paper text-ink"}`}
    >
      {children}
    </button>
  );
}

function MoveMenu({
  collections,
  currentCollectionId,
  onMove,
  onCreate,
  onClose,
}: {
  collections: any[];
  currentCollectionId: string | null;
  onMove: (id: string | null) => void;
  onCreate: (name: string) => void;
  onClose: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function onDoc(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [onClose]);
  return (
    <div ref={ref} className="absolute z-20 top-14 right-3 bg-white hairline rounded-2xl shadow-xl overflow-hidden min-w-[200px]">
      <div className="px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-soft border-b border-border-soft">Move to</div>
      <button onClick={() => onMove(null)} className={`w-full text-left px-4 py-2 text-sm hover:bg-paper ${currentCollectionId == null ? "font-semibold" : ""}`}>
        Uncategorized
      </button>
      {collections.map((c) => (
        <button key={c.id} onClick={() => onMove(c.id)} className={`w-full text-left px-4 py-2 text-sm hover:bg-paper ${currentCollectionId === c.id ? "font-semibold" : ""}`}>
          {c.emoji && <span className="mr-1">{c.emoji}</span>}{c.name}
        </button>
      ))}
      <div className="border-t border-border-soft">
        {adding ? (
          <form
            onSubmit={(e) => { e.preventDefault(); if (name.trim()) { onCreate(name.trim()); setName(""); setAdding(false); } }}
            className="flex items-center gap-1 p-2"
          >
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="New collection" className="flex-1 bg-paper rounded-full px-3 py-1.5 text-sm outline-none" />
            <button type="submit" className="size-7 grid place-items-center rounded-full bg-ink text-cream"><Check className="size-3.5" /></button>
          </form>
        ) : (
          <button onClick={() => setAdding(true)} className="w-full text-left px-4 py-2 text-sm hover:bg-paper inline-flex items-center gap-1.5">
            <Plus className="size-3.5" /> New collection
          </button>
        )}
      </div>
    </div>
  );
}