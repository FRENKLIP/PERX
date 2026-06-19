# Employee home (`/app`) redesign — bento + 3D

Scope is **only** `/app` (employee logged-in home). No changes to employer, provider, marketplace, or landing.

## What changes
Recompose `src/routes/_authenticated/app.tsx` from a vertical stack of sections into a true 12-col bento using the `.tile` / `.bento` utilities already added. The cash-stack 3D scene becomes the visual anchor; everything else slots around it as right-sized tiles.

## Layout (desktop)
```text
┌──────────────────────────────┬─────────────────┐
│  HERO TILE (cash stack 3D)   │  GREETING +     │
│  spans 8 col × 2 row         │  BUDGET RING    │
│  - live banknote stack       │  4 col × 1 row  │
│  - remaining ALL big number  ├─────────────────┤
│  - "spent / budget" caption  │  NEAR YOU       │
│                              │  4 col × 1 row  │
│                              │  (offer count + │
│                              │   mini map)     │
├──────────────────────────────┴─────────────────┤
│  MOOD STRIP (12 col, hairline, sticky)         │
├────────────┬───────────────────────────────────┤
│  WALLET    │  PROVIDER MAP PANEL               │
│  SIM       │  7 col × 1 row                    │
│  5 col     │                                   │
├────────────┴───────────────────────────────────┤
│  WEEKLY MARQUEE (12 col, dark tile)            │
├────────────────────────────────────────────────┤
│  EDITOR BENTO (12 col, existing inner grid)    │
└────────────────────────────────────────────────┘
```
Mobile collapses to a single column; cash-stack tile keeps the 3D canvas, others stack in the order shown.

## Concrete edits
- `src/routes/_authenticated/app.tsx`: wrap the page in `<div className="bento">`, give each existing component a tile wrapper with explicit `col-span` / `row-span`. Move greeting + budget summary out of `Hero3DEmployee` into a dedicated small tile so the hero tile is pure 3D + remaining number.
- `src/components/home/Hero3DEmployee.tsx`: strip the inline greeting/header so it becomes a pure scene tile (full-bleed Canvas with the remaining ALL overlay). Keep all existing 3D logic and props.
- New tiny tile components inside `app.tsx` (no new files): `GreetingTile`, `NearYouTile` — both use `.tile` with hairline borders and Sora numerics.
- `WalletSim`, `ProviderMapPanel`, `WeeklyMarquee`, `EditorBento` rendered inside `.tile` / `.tile-dark` wrappers with consistent padding (`p-6 md:p-8`). No changes to their internal logic.
- Sticky `MoodPicker` strip restyled as a hairline pill bar inside a 12-col tile.

## Out of scope
- No backend / data changes.
- No edits to employer, provider, marketplace, landing, or shared shell.
- No new 3D scenes — only the existing cash stack is reused.

## Verification
- Visit `/app` in preview at 1786px and 390px; confirm bento layout renders, 3D hero is the visual anchor, no orange anywhere, all existing interactions (mood, wallet sim, map, add-to-cart) still work.
