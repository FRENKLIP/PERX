Scope: `src/routes/_authenticated/concierge.tsx` only.

## Changes

1. **Narrower container + bigger text (zoom in)**
   - Container: `max-w-3xl` → `max-w-2xl`, `pt-10` → `pt-16`.
   - Eyebrow label: `text-[11px]` → `text-xs`, tracking unchanged.
   - H1: `text-5xl` → `text-6xl md:text-7xl`.
   - Subhead paragraph: `text-base` (default) → `text-lg md:text-xl`, `mt-3` → `mt-4`, `max-w-lg` → `max-w-xl`.
   - Input bar: `text-sm` → `text-base`, padding bumped (`py-2.5` → `py-3.5`), send button `size-11` → `size-12`.

2. **Prompt cards — restyle + bigger**
   - Drop the italic serif look (doesn't match the rest of the app chrome).
   - Switch to the site's display sans (`font-display`, i.e. Sora) for a clean editorial feel that matches nav/buttons; remove the quote marks around the text.
   - Increase size: card padding `p-4` → `p-6`, text `text-sm` → `text-lg`, leading relaxed, medium weight.
   - Keep `hairline` border and hover state.
   - Grid gap `gap-2` → `gap-3`.

## Technical notes
- `font-display` utility maps to `var(--font-display)` = Sora (already in `src/styles.css`).
- Remove the literal `"{s}"` wrapping quotes inside each button; just render `{s}`.
- No other files touched, no logic changes.
