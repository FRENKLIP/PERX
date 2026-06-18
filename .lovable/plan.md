## Goal

Turn the employee home (`/app`) from a stacked feed into a playful, interactive cockpit. Tone dial = 4: bold, tactile, a little loud — but still on the existing cream/ink/red palette so it stays coherent with the rest of PERX.

## Layout (top → bottom)

```
┌───────────────────────────────────────────────────────────────┐
│ 1 · 3D PARALLAX HERO                                          │
│   greeting + wallet ring + floating perk objects (r3f)        │
│   mouse tilts the scene; scroll parallaxes the cards          │
├───────────────────────────────────────────────────────────────┤
│ 2 · MOOD PICKER                                               │
│   5 chips (Energized · Cozy · Social · Curious · Treat)       │
│   selecting one re-sorts the rails below with a smooth        │
│   FLIP-style animation                                        │
├───────────────────────────────────────────────────────────────┤
│ 3 · LIVE WALLET SIMULATOR                                     │
│   left: animated wallet ring + "what if" basket               │
│   right: draggable offer chips → drop into basket;            │
│   ring depletes in real time, shows "you'd have X left"       │
│   one-click "send for approval" turns sim into real cart      │
├───────────────────────────────────────────────────────────────┤
│ 4 · TIRANA MAP                                                │
│   interactive SVG/Leaflet map of Tirana neighborhoods         │
│   provider pins; hover = mini card; click = offer drawer      │
│   neighborhood filter chips above                             │
├───────────────────────────────────────────────────────────────┤
│ 5 · WEEKLY DROP (kept, restyled as marquee strip)             │
├───────────────────────────────────────────────────────────────┤
│ 6 · EDITOR'S PICKS (kept, re-skinned as bento, not grid)      │
└───────────────────────────────────────────────────────────────┘
```

## Sections in detail

**1 · 3D parallax hero** — `Hero3DEmployee.tsx` using `@react-three/fiber` (already installed). Floating coffee cup, dumbbell, luggage tag, theatre mask orbit a central WalletRing rendered as a 3D torus. Mouse moves the camera 5°, scroll moves objects on the z-axis. Mobile + reduced-motion fallback = static SVG composition. Greeting + CTAs sit in front of the canvas. Stat ribbon below: "Refreshes in N days · X ALL untouched · N offers near you".

**2 · Mood picker** — `MoodPicker.tsx`. Five pill chips, each tagged with category slugs (Energized→fitness, Cozy→food/wellness, Social→dining/events, Curious→learning/culture, Treat→travel/beauty). Selection sets a `mood` state shared with sections 3 & 6; cards reorder via `layout` prop simulation (CSS transitions on translate).

**3 · Live wallet simulator** — `WalletSim.tsx`. Native HTML5 drag-and-drop (no extra deps): offer chips on the right are draggable, basket on the left is a drop zone. Each drop pushes to local `sim` state, the WalletRing animates the new "after" value with a ghosted arc showing the delta. "Clear", "Send to cart" buttons. "Send to cart" loops upserts into `cart_items` (existing table) — no schema changes.

**4 · Tirana map** — `TiranaMap.tsx` already exists in the project; extend it. Pull `companies` rows (kind=provider, lat/lng or neighborhood centroid fallback). Hover pin → floating card with name + offer count + cheapest price; click → opens an offer drawer (shadcn Sheet) listing that provider's offers with add-to-cart.

**5 · Weekly drop** — same `/api/weekly-drop` data, restyled as a horizontal marquee of 3 cards inside an ink panel with the AI label.

**6 · Editor's picks bento** — same offers, rendered as an asymmetric bento (1 tall hero + 4 small) instead of a uniform 3-col grid; respects current mood filter.

## Files

- create `src/components/home/Hero3DEmployee.tsx` (r3f scene + SVG fallback)
- create `src/components/home/MoodPicker.tsx`
- create `src/components/home/WalletSim.tsx`
- create `src/components/home/ProviderMapPanel.tsx` (wraps existing `TiranaMap`, adds drawer + filters)
- create `src/components/home/WeeklyMarquee.tsx`
- create `src/components/home/EditorBento.tsx`
- rewrite `src/routes/_authenticated/app.tsx` to compose them; keep existing query + addToCart logic
- add a tiny `useMood` context (single file, no new dep) for sections 2/3/6

## Constraints & non-goals

- No schema changes, no new packages — `three`, `@react-three/fiber`, `@react-three/drei` are already installed for the landing page; reuse them. `sonner`, `lucide-react`, shadcn `Sheet` already present.
- Keep cream / ink / accent-red tokens — no new colors.
- Reduced motion + mobile both fall back to a static hero and disable drag (tap-to-add instead).
- Employer and provider dashboards untouched.
