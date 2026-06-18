## Goal
Tapping an offer card (in `/marketplace`, `/app`, and the Tirana map popup) opens a dedicated detail page with the offer's full info.

## New route
`src/routes/_authenticated/offer.$offerId.tsx` → URL `/offer/$offerId`.

Loader fetches the offer + provider company by id:
```
supabase.from("offers")
  .select("*, companies:provider_company_id(name,description,city,neighborhood,address,lat,lng,hero_image_url,logo_url)")
  .eq("id", offerId).single()
```

### Layout
```text
┌────────────────────────────────────────────────────────────┐
│ ← Back to marketplace                                      │
├──────────────────────────────┬─────────────────────────────┤
│  [hero image, 4:3 rounded]   │  WELLNESS · BLLOKU          │
│                              │  Iron Gym monthly pass      │
│                              │  by Iron Gym Tirana         │
│                              │                             │
│                              │  6 500 ALL  / item          │
│                              │  [ Add to cart ]            │
│                              │  [ Open in concierge ]      │
├──────────────────────────────┴─────────────────────────────┤
│  About this offer       │  Tags · seasonal? · category    │
│  (description, sq variant when locale=sq)                 │
├────────────────────────────────────────────────────────────┤
│  About the provider                                        │
│  (company description, neighborhood/address)               │
│  [ mini map if lat/lng present ]                           │
└────────────────────────────────────────────────────────────┘
```

## Wiring
1. **Cards become links.** In `marketplace.tsx` and `app.tsx`, the offer card's image+title area becomes a `<Link to="/offer/$offerId" params={{ offerId: o.id }}>`. The cart `+` button stays a separate button (`e.stopPropagation` / sits outside the link) so quick-add still works without leaving the page.
2. **Map popup.** `TiranaMap.tsx` popup gets a "View details" link to the same route.
3. **Detail page actions:** Add to cart (same RPC as marketplace), Back link to `/marketplace`.

## Files
- `src/routes/_authenticated/offer.$offerId.tsx` (new)
- `src/routes/_authenticated/marketplace.tsx` (wrap card in Link)
- `src/routes/_authenticated/app.tsx` (wrap featured cards in Link)
- `src/components/TiranaMap.tsx` (add "View details" link in popup)

## Notes
- Route lives under `_authenticated/`, so auth gating is automatic.
- `errorComponent` + `notFoundComponent` on the new route handle bad ids.
- Reuses existing tokens (`cream/ink/accent-red`, serif headline) — same editorial styling as the rest of the app, no new design system.
