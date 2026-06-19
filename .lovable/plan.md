## Goal

Ship two independent features:
1. **Saved Offer Collections** — let employees group saved offers into named collections (Weekend, Healthy week, Date night, Next month, custom).
2. **Provider Offer Editing** — give providers a full edit flow for an existing offer matching the "New offer" form (title, price, category, image, description, co-providers, location).

---

## 1. Saved Offer Collections

### Data model (migration)
- New table `public.saved_collections` with: `user_id` (FK auth.users), `name` (text), `emoji` (text, optional), `sort_order` (int).
- Add `collection_id uuid null` column to existing `public.favorites` (null = "All saved" / uncategorized). On collection delete → set null.
- RLS: owner-only (`auth.uid() = user_id`) on `saved_collections`; existing favorites policies already scope to user.
- GRANT block + service_role per project rules.
- Seed nothing — collections are user-created. We'll suggest 4 starter chips in the UI ("Weekend", "Healthy week", "Date night", "Next month") that create on first click.

### UI — `src/routes/_authenticated/saved.tsx`
- Header gets a horizontal collection switcher (pill row): **All · [collections…] · + New**.
  - "+ New" opens a small inline input → creates collection.
  - Active pill filters the grid by `collection_id`.
  - Long-press / kebab on a pill → rename / delete (confirm).
- Empty state for a specific collection: "Nothing in [name] yet. Save offers and tag them here."
- Each saved card gets a small "Move to…" menu (folder icon next to the heart) that lists collections + "+ New collection". Updates `favorites.collection_id`.
- Suggested starter chips: if user has zero collections, show 4 ghost chips that create-on-click.

### UI — `FavoriteButton.tsx`
- Unchanged behavior on tap (save to "All / no collection").
- Long-press / right-click optional follow-up — **out of scope** for v1 to keep the interaction simple. Moving happens on the Saved page.

### Query keys
- `["saved-offers", collectionId | "all"]` — invalidate on move/create/delete.
- `["saved-collections"]` — fetch list once for switcher + move menu.

---

## 2. Provider Offer Editing

### New component `src/components/provider/OfferEditSheet.tsx`
- Right-side slide-over (same minimal style as `ProfileDrawer`).
- Reuses the exact field set from the existing inline "New offer" form in `provider.tsx`: Title, Price (ALL), Location, Category, Description, Cover image (with current image preview + replace/remove), `CoProviderEditor` (pre-populated from `offer_providers`).
- Save button: updates `public.offers` row; diff-applies co-providers (insert new, delete removed, update share_pct).
- Delete button (destructive, with confirm) — soft option: just toggle `is_active=false`. We'll include both: "Pause" (existing) and "Delete" (hard delete, only if no `request_items` exist; otherwise toast "Pause instead — this offer has orders").
- Image: if user picks a new file, upload to `offer-images` bucket and update `image_url`; old image left in bucket (cleanup is out of scope).

### Wiring — `src/routes/_authenticated/provider.tsx`
- In the offers list (below "Incoming orders"), each owned offer row gets an **Edit** button next to existing Activate/Pause.
- Edit only shown when current company is the owner (`is_owner=true` in `offer_providers`, or `provider_company_id` matches). Co-listed providers see no Edit.
- Opens `<OfferEditSheet offer={…} onClose={…} />`; on save → `qc.invalidateQueries({ queryKey: ["provider-data"] })`.

### Refactor
- Extract the current "New offer" form body into a shared `<OfferForm mode="create" | "edit" …/>` used by both the inline create panel and the edit sheet. Keeps validation/image-upload/co-provider logic in one place.

---

## Out of scope
- Sharing collections between users.
- Reordering offers within a collection.
- Bulk move / multi-select on Saved.
- Image cleanup in storage on edit/delete.
- Versioning / audit log of offer edits.
- Localized (`title_sq`, `description_sq`) editing — current form doesn't expose these; keeping parity.

---

## Technical notes
- Migration includes GRANTs and RLS per project standards.
- `favorites.collection_id` is nullable so existing rows keep working without backfill.
- Edit sheet imports `CoProviderEditor` as-is; the diff logic lives in the sheet's submit handler.
- Both features are independent — can be built and shipped in either order.
