## Editorial Redesign + Real Tirana Data

A full pass across all 7 pages: quieter look, real local providers, map, AI weekly drop, animated wallet, story cards.

### Visual direction — "Editorial calm"

Inspired by Apple/Airbnb/Cereal magazine. Less saturated color, more whitespace, confident typography, restrained motion.

- **Type**: Keep Sora display, swap body to **Instrument Serif** for editorial headlines + Manrope for UI. Larger leading, generous tracking.
- **Palette**: Warm paper `#FAF7F2`, ink `#171717`, single accent `#C5503A` (Tirana terracotta), muted sage `#7A8B6F` for success/wallet. Drop the loud red/orange blocks.
- **Components**: Thin 1px hairlines instead of soft borders, 20px radii (not 32px), no gradient blocks, photography-first cards.
- **Motion**: One scroll-driven fade per section, hover lifts 2px, wallet ring tweens with `requestAnimationFrame`. No marquees, no pulsing dots.

### Real Tirana data (database)

Migration:
- Add `address text`, `lat double precision`, `lng double precision`, `image_url` (already on offers) to `companies`.
- Reseed `companies` + `offers` with ~24 real Tirana providers across the 4 categories with real names, addresses, neighborhood, lat/lng (sourced from public listings), and Unsplash images keyed to the venue type.

Seed sample:
- **Gyms & wellness**: Iron Gym Tirana (Blloku), Fitness Gym Tirana, Aqua Aerobic Center, Yogavibes Studio, Sky Tower Gym, AlbStone Climbing
- **Restaurants & cafes**: Mullixhiu, Salt, Artigiano, Komiteti Kafe Muzeum, Era, Padam Boutique Hotel & Restaurant
- **Travel & escapes**: Theth weekend (Albturist), Ksamil 2-night (Albania Holidays), Dhërmi beach day, Llogara hike
- **Learning & coworking**: Coolab coworking, Destil Creative Hub, Albanian School of Programming, Tirana Language School

All values inserted via a migration (`INSERT … ON CONFLICT`). Demo accounts (`era@perx.demo` etc.) seeded the same migration.

### Pages

1. **Landing `/`** — One-screen hero: oversized serif headline, single photo of Tirana street, 3 role rows (not cards). Tiny footer.

2. **Home `/app`** — Replace bento with a magazine grid:
   - Top: greeting + animated **wallet ring** (SVG, sage stroke fills to current spend, tween 1.2s).
   - **AI weekly drop** card (server function calls Lovable AI → 3 suggested offers based on category mix; cached 24h in localStorage with date key).
   - **Provider stories** horizontal scroller (Instagram-style tappable circles → modal with venue photo, vibe blurb, "add to cart").
   - "Editor's picks" — 3-up photo cards, no colored backgrounds.

3. **Marketplace `/marketplace`** — Split view:
   - Left: filter rail (category, neighborhood chip, price slider).
   - Right toggle: **List** (clean photo cards) ↔ **Map** (Leaflet + OpenStreetMap tiles, free; pins colored by category, popup with mini-card).
   - Add `leaflet` + `react-leaflet` via bun. CSS imported in marketplace route only.

4. **Concierge `/concierge`** — Strip to a focused chat surface: serif greeting, single input pinned bottom, offer cards inline with messages. Remove decorative chrome.

5. **Cart `/cart`** — Two columns: line items (with photos) | sticky summary with wallet ring shrinking as items added + single "Submit for approval" CTA.

6. **Requests `/requests`** — Timeline list: status pill, date, total, expandable items. Filter tabs: All / Pending / Approved / Rejected.

7. **Employer `/employer`** — Editorial dashboard: KPI strip (employees, monthly spend, redemption rate), AI-written team summary (Lovable AI from real request data), pending approvals table with inline approve/reject, top categories bar chart (recharts).

8. **Provider `/provider`** — Same editorial frame: KPI strip (views, redemptions, revenue ALL), offers table with edit-in-place, "add new offer" sheet.

### Nav

Replace pill nav with a thin top bar: brand left, single nav row centered, wallet pill + avatar right. Mobile: bottom tab bar (4 icons) for employees only.

### New deps

- `leaflet`, `react-leaflet` — map
- `@fontsource/instrument-serif` — editorial type

### Out of scope

- No payment flow.
- No real provider login/onboarding beyond what exists.
- Map uses free OSM tiles, no Mapbox token.
- Wallet ring is presentation only — actual budget math unchanged.

### Build error

The async `build:dev` error in the message is the same transient rolldown issue that cleared on rerun before. I'll run a fresh build at the end and only intervene if it reproduces.

### Verification

- Run `build:dev`, check preview at `/app`, `/marketplace` (map renders), `/employer`.
- Spot-check Tirana addresses geocode to map pins inside the city.