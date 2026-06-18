# Full app redesign — Emerald Prestige, glassy & futuristic

A complete visual overhaul. Tear out the cream/ink/red "Claude" palette. Replace with deep emerald glass surfaces, soft gold accents, and quiet Urbanist/Epilogue type. The whole product moves from editorial magazine to after-hours premium banking, with glassmorphism, depth, and a single, beautifully restrained motion language.

## Design system rewrite

**Color tokens (replaces all current ones in `src/styles.css`):**
```
--obsidian:   #050b0a     // base canvas (deepest)
--forest:     #07211b     // primary surface
--emerald:    #064e3b     // brand
--emerald-2:  #0d7a5f     // brand lift
--gold:       #c9a84c     // primary accent
--gold-soft:  #f0d78c     // secondary accent
--bone:       #f5f0e0     // text on dark
--bone-soft:  rgba(245,240,224,0.62)
--glass-line: rgba(245,240,224,0.10)
--glass-fill: rgba(245,240,224,0.04)
```
Plus a single hero gradient (`--mesh`) — a soft conic blend of emerald → forest → gold used behind hero sections.

Every existing utility (`bg-cream`, `text-ink`, `text-accent-red`, `bg-paper`, `hairline`, etc.) is **kept as an alias** mapped to the new tokens, so no component needs to be re-themed. `cream → bone`, `ink → bone`, `paper → forest`, `accent-red → gold`, `accent-orange → gold-soft`, `sage → emerald-2`, `border-soft → glass-line`. Backgrounds flip from light to dark globally with one swap.

**Typography:** Urbanist for display (was Instrument Serif), Epilogue for body (was Manrope). Loaded via `@fontsource/urbanist` and `@fontsource/epilogue`. `font-serif` utility re-mapped to Urbanist so all existing serif headlines instantly inherit the new face — no per-file edits.

**Surfaces:** every card becomes a glass plate — `bg-glass-fill` + `backdrop-blur-2xl` + 1px `border-glass-line` + soft inner gold glow on hover. Radii bump from `rounded-3xl` → `rounded-[28px]`. Shadows replaced with a layered emerald glow + subtle gold rim.

**Motion language:** one move, used everywhere — a slow 700ms fade-up with a hairline gold underline drawing in from left on section reveal. Buttons use a gold sheen sweep on hover. No more red flashes.

## New visual primitives (used across the app)

- **`MeshBackdrop`** — a fixed full-viewport conic-gradient mesh + animated noise + faint star field that sits behind every page. Built with CSS only (gradients + `mask-image`), no JS. Lives in `__root.tsx`.
- **`GlassCard`** — drop-in replacement wrapper that gives any panel the new frosted look. Used by `StatTile`, dashboard cards, offer cards, auth card.
- **`GoldUnderline`** — animated 1px gold rule used under section labels and active nav items.
- **`AuroraOrb`** — a single GPU-cheap blurred emerald/gold blob that drifts behind the hero (CSS keyframes, no canvas). Replaces the heavier 3D scene when paired with it for low-end devices; the existing r3f hero stays but its materials switch to brushed-gold + emerald glass.

## Per-surface changes

- **Root shell (`__root.tsx`)** — body becomes `--obsidian`; mounts `MeshBackdrop` once; sets `<html class="dark">`.
- **Landing (`/`)** — same long-scroll structure, restyled: nav becomes floating glass pill, hero copy in Urbanist, 3D wallet materials switched to emerald glass + brushed-gold pills, marquee on dark, bento tiles become glass plates with gold eyebrows, "editorial spread" parallax keeps the photo but overlays an emerald gradient + gold pull-quote, counters strip stays dark (already is) but numbers turn gold, audience panels alternate forest/obsidian (no more cream), FAQ on glass, footer obsidian.
- **`AppShell`** — top nav becomes a centered floating glass pill (Arc-style). Mobile tab bar becomes a single floating glass dock with a gold active pill. All `bg-cream` headers → glass.
- **Marketplace + employee app** — offer cards become glass plates; category chips gold-outline; search bar inset glass with a gold focus ring.
- **Offer detail** — hero image gets emerald gradient wash + gold price tag; CTA button becomes a brushed-gold pill.
- **Employer + provider dashboards** — `StatTile` rebuilt on `GlassCard`; KPI numbers in Urbanist gold; charts (recharts) re-themed: emerald-2 stroke, gold area gradient, glass tooltip. Tables become glass rows with hairline separators.
- **Auth card** — single glass panel centered over the mesh backdrop; segmented "Sign in / Create account" toggle becomes a gold pill slider; demo accounts become three glass mini-cards with role icons.
- **Saved page, Reviews, Favorites** — inherit automatically via token swap; only minor spacing polish.

## Files touched

- `src/styles.css` — full token rewrite, font swap, new utilities (`glass`, `gold-underline`, `mesh-bg`).
- `src/routes/__root.tsx` — add `<html class="dark">`, mount `MeshBackdrop`.
- `src/components/visual/MeshBackdrop.tsx` *(new)*
- `src/components/visual/GlassCard.tsx` *(new)*
- `src/components/visual/AuroraOrb.tsx` *(new)*
- `src/components/landing/Hero3DScene.tsx` — material colors: card stack to emerald glass, pills to brushed gold/emerald/gold-soft, env preset to `night`.
- `src/components/landing/AudiencePanels.tsx` — tone palette flips to forest/obsidian.
- `src/components/landing/BentoGrid.tsx` — tile backgrounds → glass variants + gold accents.
- `src/components/AppShell.tsx` — floating glass nav + dock.
- `src/components/StatTile.tsx`, `src/components/DashboardCharts.tsx` — glass surfaces, recharts theme.
- `src/routes/index.tsx` — minor copy/contrast tweaks (no structural change).
- `src/routes/auth.tsx` and any other auth surface — wrap in `GlassCard`.
- `package.json` — add `@fontsource/urbanist`, `@fontsource/epilogue`; drop unused Instrument Serif import.

## Notes

- No new dependencies beyond the two `@fontsource` packages. No motion library, no extra 3D libs — the wallet scene already uses r3f.
- Existing semantic Tailwind classes keep working because the rewrite happens at the token layer; this is a redesign, not a refactor.
- The Cloud-managed shadcn `:root` color tokens at the bottom of `styles.css` flip to dark values so all shadcn components (buttons, dialogs, dropdowns) match the new theme automatically.
- One coherent move, executed everywhere — no per-page bespoke styling that breaks the system.