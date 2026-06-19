# Remove 3D + remove WalletSim + lean into sage green

## 1. Remove the Wallet Simulator
- Drop the `<WalletSim>` tile from `src/routes/_authenticated/app.tsx`.
- The `ProviderMapPanel` takes its spot and expands to **full width** (`col-span-12`) where Wallet+Map used to sit.
- Remove `WalletSim` import and `picks` / `setPicks` / `simTotal` state — no longer needed on this page.
- The `Hero3DEmployee` `simTotal` prop already defaults to `0`; remove the prop from the call site too.
- `src/components/home/WalletSim.tsx` stays on disk (not deleted) but is no longer referenced.

## 2. Remove all 3D from the site
Replace every `<Canvas>`-backed scene with the existing static SVG / CSS fallback. No `@react-three/fiber` rendering anywhere.

- `src/components/landing/Hero3D.tsx` — keep the component shell, render only `HeroFallback` (the SVG cash-stack already there); delete the dynamic import of `Hero3DScene`.
- `src/components/landing/Hero3DScene.tsx` — delete file.
- `src/components/home/Hero3DEmployee.tsx` — strip the lazy-loaded `<Scene>`; the tile renders a flat cream/paper background with the existing "Remaining ALL" overlay only.
- `src/components/home/HomeHeroScene.tsx` — delete file.
- No other Canvas usages exist.

R3F packages stay installed (cheap, no runtime cost since nothing imports them). No code references remain.

## 3. Lean into sage green
Raise sage from a single accent dot to a recurring secondary accent across the marketing site and the employee app. Red stays the primary warm accent; sage becomes the supporting cool accent.

Specific moves:
- `src/styles.css`: add `--color-sage-soft: #e7ece2` (tint for backgrounds) and `--color-sage-deep: #5e6e54` (for text on cream). Add a `.tile-sage` utility (sage background, cream text) mirroring `.tile-accent`.
- Landing (`src/routes/index.tsx`):
  - Section labels' eyebrow dot → sage.
  - "How it works" step numbers backgrounds → sage-soft.
  - Second CTA ("See how it works") underline hover → sage.
  - Footer hover state on links → sage instead of red.
- `BentoGrid.tsx`: keep the existing `bg-sage` tile, also tint the "Live dashboard" tile background with `bg-sage-soft` so green appears on the light side too.
- `AudiencePanels.tsx`: make the Employer panel sage-accented (currently red); keep Employee red, Provider stays ink.
- `/app` (`app.tsx`):
  - Greeting tile: swap the red accent name color for sage (the firstName line goes sage, not red).
  - "Near you" tile's MapPin icon: sage.
  - WalletRing accent color (in `WalletRing.tsx`): the progress arc switches from red to sage; over-budget state stays red.
- `Hero3DEmployee.tsx` (now flat): "Remaining" label dot + a thin sage underline beneath the big number for visual weight.
- `MoodPicker.tsx`: active chip's outline tint → sage.

## Files touched
Edit: `src/styles.css`, `src/routes/_authenticated/app.tsx`, `src/components/home/Hero3DEmployee.tsx`, `src/components/landing/Hero3D.tsx`, `src/routes/index.tsx`, `src/components/landing/BentoGrid.tsx`, `src/components/landing/AudiencePanels.tsx`, `src/components/landing/HowItWorks.tsx`, `src/components/WalletRing.tsx`, `src/components/home/MoodPicker.tsx`.
Delete: `src/components/landing/Hero3DScene.tsx`, `src/components/home/HomeHeroScene.tsx`.

## Out of scope
- No layout changes beyond removing Wallet sim and expanding the map.
- No backend changes.
- No employer / provider / marketplace edits this pass.

## Verification
- `rg "@react-three|Canvas" src/` returns no matches in app code.
- `/app` shows hero tile (flat) + greeting tile + near-you tile + mood strip + full-width map + weekly marquee + editor bento — no wallet simulator.
- Landing hero shows the static SVG cash-stack, no WebGL.
- Sage appears in at least 4 distinct locations across landing and `/app`.
