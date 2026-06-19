import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { X, Upload, Loader2, Trash2 } from "lucide-react";
import { CoProviderEditor, type CoProviderDraft } from "@/components/CoProviderEditor";

type OfferRow = {
  id: string;
  title: string;
  description: string | null;
  price_all: number;
  category_slug: string;
  location: string | null;
  image_url: string | null;
  provider_company_id: string;
  is_active: boolean | null;
};

export function OfferEditSheet({
  offer,
  ownerCompanyId,
  ownerName,
  categories,
  onClose,
}: {
  offer: OfferRow;
  ownerCompanyId: string;
  ownerName: string;
  categories: { slug: string; name_en: string }[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    title: offer.title ?? "",
    description: offer.description ?? "",
    price: String(offer.price_all ?? 0),
    category: offer.category_slug ?? "wellness",
    location: offer.location ?? "Tirana",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(offer.image_url ?? null);
  const [imageCleared, setImageCleared] = useState(false);
  const [coProviders, setCoProviders] = useState<CoProviderDraft[]>([]);
  const [initialOtherIds, setInitialOtherIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("offer_providers")
        .select("provider_company_id, share_pct, is_owner, companies:provider_company_id(name)")
        .eq("offer_id", offer.id);
      const others = (data ?? []).filter((r: any) => !r.is_owner);
      setCoProviders(
        others.map((r: any) => ({
          company_id: r.provider_company_id,
          name: r.companies?.name ?? "Provider",
          share_pct: r.share_pct ?? 0,
        })),
      );
      setInitialOtherIds(new Set(others.map((r: any) => r.provider_company_id)));
    })();
  }, [offer.id]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function handleImagePick(file: File | null) {
    if (!file) { setImageFile(null); setImagePreview(null); setImageCleared(true); return; }
    if (!file.type.startsWith("image/")) { toast.error("Please pick an image file"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Max 5MB"); return; }
    setImageFile(file);
    setImageCleared(false);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const othersTotal = coProviders.reduce((s, c) => s + (c.share_pct || 0), 0);
    if (othersTotal > 100) { toast.error("Total co-provider share exceeds 100%"); return; }
    setSaving(true);

    let image_url: string | null | undefined = undefined;
    if (imageFile) {
      const ext = imageFile.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const path = `${ownerCompanyId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("offer-images").upload(path, imageFile, {
        cacheControl: "3600", upsert: false, contentType: imageFile.type,
      });
      if (upErr) { setSaving(false); toast.error(upErr.message); return; }
      image_url = supabase.storage.from("offer-images").getPublicUrl(path).data.publicUrl;
    } else if (imageCleared) {
      image_url = null;
    }

    const patch: {
      title: string;
      description: string;
      price_all: number;
      category_slug: string;
      location: string;
      image_url?: string | null;
    } = {
      title: form.title,
      description: form.description,
      price_all: parseInt(form.price, 10),
      category_slug: form.category,
      location: form.location,
    };
    if (image_url !== undefined) patch.image_url = image_url;

    const { error } = await supabase.from("offers").update(patch).eq("id", offer.id);
    if (error) { setSaving(false); toast.error(error.message); return; }

    // Diff co-providers
    const currentIds = new Set(coProviders.map((c) => c.company_id));
    const toRemove = [...initialOtherIds].filter((id) => !currentIds.has(id));
    const toAdd = coProviders.filter((c) => !initialOtherIds.has(c.company_id));
    const toUpdate = coProviders.filter((c) => initialOtherIds.has(c.company_id));

    if (toRemove.length) {
      await supabase.from("offer_providers").delete()
        .eq("offer_id", offer.id).in("provider_company_id", toRemove);
    }
    for (const c of toUpdate) {
      await supabase.from("offer_providers")
        .update({ share_pct: c.share_pct })
        .eq("offer_id", offer.id).eq("provider_company_id", c.company_id);
    }
    if (toAdd.length) {
      await supabase.from("offer_providers").insert(
        toAdd.map((c) => ({
          offer_id: offer.id,
          provider_company_id: c.company_id,
          share_pct: c.share_pct,
          is_owner: false,
          accepted_at: null,
        })),
      );
    }
    // Owner share = 100 - others
    const ownerShare = Math.max(0, 100 - othersTotal);
    await supabase.from("offer_providers")
      .update({ share_pct: ownerShare })
      .eq("offer_id", offer.id).eq("provider_company_id", ownerCompanyId);

    setSaving(false);
    toast.success("Offer updated");
    qc.invalidateQueries({ queryKey: ["provider-data"] });
    onClose();
  }

  async function del() {
    if (!confirm("Delete this offer? This cannot be undone.")) return;
    setDeleting(true);
    const { count } = await supabase
      .from("request_items")
      .select("id", { count: "exact", head: true })
      .eq("offer_id", offer.id);
    if ((count ?? 0) > 0) {
      setDeleting(false);
      toast.error("This offer has orders — pause it instead.");
      return;
    }
    await supabase.from("offer_providers").delete().eq("offer_id", offer.id);
    const { error } = await supabase.from("offers").delete().eq("id", offer.id);
    setDeleting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Offer deleted");
    qc.invalidateQueries({ queryKey: ["provider-data"] });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[80] flex">
      <button aria-label="Close" onClick={onClose} className="absolute inset-0 bg-ink/40 backdrop-blur-sm" />
      <div className="relative ml-auto h-full w-full max-w-2xl bg-cream shadow-2xl overflow-y-auto">
        <div className="sticky top-0 z-10 bg-cream/95 backdrop-blur border-b border-border-soft px-6 py-4 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-soft">Edit offer</div>
            <h2 className="font-serif text-2xl">{offer.title}</h2>
          </div>
          <button onClick={onClose} className="size-9 grid place-items-center rounded-full hover:bg-paper">
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={save} className="p-6 grid sm:grid-cols-2 gap-4">
          <EField label="Title" value={form.title} onChange={(v) => setForm({ ...form, title: v })} />
          <EField label="Price (ALL)" type="number" value={form.price} onChange={(v) => setForm({ ...form, price: v })} />
          <EField label="Location" value={form.location} onChange={(v) => setForm({ ...form, location: v })} />
          <label className="block">
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-soft mb-2 block">Category</span>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full bg-paper rounded-2xl px-4 py-3 outline-none">
              {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name_en}</option>)}
            </select>
          </label>
          <label className="block sm:col-span-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-soft mb-2 block">Description</span>
            <textarea required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full bg-paper rounded-2xl px-4 py-3 outline-none" rows={4} />
          </label>

          <CoProviderEditor
            ownerCompanyId={ownerCompanyId}
            ownerName={ownerName}
            value={coProviders}
            onChange={setCoProviders}
          />

          <div className="sm:col-span-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-soft mb-2 block">Cover image</span>
            {imagePreview ? (
              <div className="relative rounded-2xl overflow-hidden hairline group">
                <img src={imagePreview} alt="" className="w-full aspect-[16/9] object-cover" />
                <button type="button" onClick={() => handleImagePick(null)} className="absolute top-3 right-3 size-9 grid place-items-center rounded-full bg-ink/80 text-cream hover:bg-accent-red transition-colors" aria-label="Remove image">
                  <X className="size-4" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-2 aspect-[16/9] sm:aspect-[21/9] bg-paper hairline rounded-2xl cursor-pointer hover:bg-paper/70 transition-colors">
                <Upload className="size-5 text-ink-soft" />
                <span className="text-sm text-ink-soft">Drop or click to upload (max 5MB)</span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImagePick(e.target.files?.[0] ?? null)} />
              </label>
            )}
          </div>

          <div className="sm:col-span-2 flex items-center gap-3 pt-2">
            <button type="button" onClick={del} disabled={deleting || saving} className="px-4 py-3 rounded-full hairline text-sm font-semibold text-accent-red hover:bg-accent-red/10 inline-flex items-center gap-2 disabled:opacity-50">
              {deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              Delete
            </button>
            <div className="flex-1" />
            <button type="button" onClick={onClose} className="px-5 py-3 rounded-full hairline text-sm font-semibold hover:bg-paper">Cancel</button>
            <button type="submit" disabled={saving} className="px-6 py-3 rounded-full bg-ink text-cream font-semibold text-sm hover:bg-accent-red transition-colors disabled:opacity-60 inline-flex items-center gap-2">
              {saving && <Loader2 className="size-4 animate-spin" />}
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EField({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="block">
      <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-soft mb-2 block">{label}</span>
      <input required type={type} value={value} onChange={(e) => onChange(e.target.value)} className="w-full bg-paper rounded-2xl px-4 py-3 outline-none" />
    </label>
  );
}