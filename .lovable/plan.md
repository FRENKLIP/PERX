## Goal
Replace the abstract floating blobs in the /app hero with a 3D **cash stack** that visibly represents the employee's actual remaining ALL budget — and shrinks in real time as they pick offers in the WalletSim below.

## What it actually shows

- A neat stack of 3D banknotes (1,000 ALL notes, the standard denomination). Stack height = `Math.round(remainingAfterPicks / 1000)` notes, capped at ~40 visible (taller stacks render as "40+ stacked" with the top note labeled with the true count).
- The top of the stack carries an embossed label: remaining ALL, formatted like `12,400 ALL`.
- A second, smaller "spent" stack lying flat beside it, growing with `spent + simTotal` — so you literally see money moving from "left" to "spent."
- Subtle PERX wordmark embossed on the side of each note.
- Behind the stacks, a soft Tirana-cream depth backdrop (no skyline yet — staying ambient).

## Connection to live data

The hero already receives `spent` and `budget`. We add a third prop, `simTotal`, lifted from the existing WalletSim:

- `AppHome` keeps the picks state at the route level (move `picks` from `WalletSim` up, or expose a small subscription via a shared store — picks already live in WalletSim; the simplest move is to lift `picks` to `AppHome` and pass `picks`/`setPicks` down).
- Hero3DEmployee computes `remaining = budget - spent - simTotal` and animates note count toward that value with a spring (lerp). So when the user drags an offer into the basket below, banknotes literally peel off the stack above.
- If `remaining < 0` (over budget), the stack flashes accent-red and a single note flips red on top.

## Ambient motion (low CPU)

- Stack idly breathes: ±2px vertical, 4s ease-in-out.
- Cursor parallax: full scene tilts up to 4°, no per-mesh rotation work.
- When a note is removed: it lifts, fades, drifts off to bottom-right in 600ms (one mesh animated at a time, max). When added back: reverse.
- `dpr: [1, 1.5]`, mobile/reduced-motion still falls back to the current static gradient — no behavior change there.

## Files

- `src/components/home/HomeHeroScene.tsx` — rewrite. New `<CashStack remaining note count />` and `<SpentSlab amount />`. Drop the torus + perks.
- `src/components/home/Hero3DEmployee.tsx` — add `simTotal` prop, pass through to `Scene`. Keep WalletRing badge in the corner (still useful as a numeric truth source).
- `src/routes/_authenticated/app.tsx` — lift `picks` state out of WalletSim, derive `simTotal = sum(picks.price_all)`, pass to both Hero3D and WalletSim.
- `src/components/home/WalletSim.tsx` — accept controlled `picks`/`setPicks` props (fallback to internal state if not provided, to keep it reusable).

No new packages — three / drei / fiber are already in use.

## Out of scope

- Real banknote artwork / textures of currency (avoiding any look-alike issues). Notes are abstract beige rectangles with the PERX wordmark and the amount, not photoreal Lek banknotes.
- Clickable notes that add/remove specific offers (you picked Ambient).
- Skyline / map (option C from the question).
- Mobile keeps the existing static fallback.