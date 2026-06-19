## Goal

Swap the WalletRing circular indicator from "remaining budget" to "days until budget refresh", with the arc filling as the month progresses.

## Changes

### 1. `src/components/WalletRing.tsx`
- Accept `daysLeft: number` as a new prop (remove `spent` / `budget`).
- Compute month progress: `target = 1 - (daysLeft / daysInMonth)` so the green arc fills up as the month advances.
- Replace the center label:
  - Headline: **"Refreshes in {daysLeft} days"** (use `font-serif`, large size)
  - Sub-label: **"of {daysInMonth} days"** (smaller, muted)
- Keep the same ring animation, SVG sizing, and sage green stroke.

### 2. `src/routes/_authenticated/app.tsx`
- Pass `daysLeft` into `<WalletRing>` instead of `spent` / `budget`.

No other files touched.