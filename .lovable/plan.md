## Goal

Replace every orange/red accent across the entire site with the existing sage green, in one sweep.

## Approach

One token swap at the source plus two literal-hex replacements. No layout or logic changes.

### 1. `src/styles.css`
Repoint the accent token to sage:
- `--color-accent-red: #c5503a;` → `--color-accent-red: #7a8b6f;` (same value as `--color-sage`).

This instantly turns every Tailwind utility built from that token green across the whole codebase — `bg-accent-red`, `text-accent-red`, `border-accent-red`, `fill-accent-red`, `decoration-accent-red`, `hover:bg-accent-red`, `bg-accent-red/15`, `accent-accent-red`, `.tile-accent`, etc. Affects landing, app, employer, provider, cart, marketplace, concierge, saved, AppShell, OfferReviews, ProviderStories, StatTile and every other file using the token.

### 2. Hardcoded `#c5503a` literals (3 spots)
- `src/components/DashboardCharts.tsx` — PALETTE array: replace both `#c5503a` entries with `#7a8b6f`.
- `src/routes/_authenticated/provider.tsx` — `<TrendArea color="#c5503a" />` and `<TopBars color="#c5503a" />`: change both to `#7a8b6f`.

### 3. Leave alone
- Destructive UI (`text-destructive`, shadcn destructive variant) stays red — it's semantic.
- `--color-sage`, `--color-sage-soft`, `--color-sage-deep` unchanged.
- No component refactors; the `accent="red" | "orange"` props in `StatTile` keep their names but render green now (they already mapped to `accent-red`).

## Files touched
- `src/styles.css`
- `src/components/DashboardCharts.tsx`
- `src/routes/_authenticated/provider.tsx`
