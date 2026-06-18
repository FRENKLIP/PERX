# Cinematic, scrollable landing page

Turn the single-fold landing into a long-scroll editorial site with a real 3D moment, keeping the existing editorial cream/ink/serif identity (no generic SaaS palette — that's what makes it feel cheap).

## New sections (top → bottom)

1. **Sticky nav** — slim glass nav (PERX · For employees · For employers · For providers · Sign in). Logo wordmark scales down once you scroll past the hero.
2. **Hero** — kept editorial headline, but the right column becomes a live **3D scene** (see below) instead of the auth card. Subtle scroll-cue chevron at the bottom.
3. **Marquee** — slow horizontal ticker of provider names ("Iron Gym · Komiteti · Mullixhiu · Coolab · Destil · Kayo Yoga · …") to signal real Tirana ecosystem.
4. **"How it works" triptych** — three big numbered cards (01 Browse, 02 Approve, 03 Get paid) that pin while a thin progress line draws between them on scroll.
5. **Bento grid of value props** — 6 unequal tiles: tax-free by design, AI concierge, real local providers, employer dashboard with live spend, instant redemption codes, multi-language (sq/en). Mixed sizes for editorial rhythm.
6. **Parallax editorial spread** — full-bleed Tirana golden-hour photo with a serif pull-quote sliding in at a slower scroll speed.
7. **Numbers strip** — four oversized counters that animate from 0 on scroll (providers, neighborhoods, ALL paid to date, languages).
8. **For each audience** — three stacked dark/light alternating panels (Employees / Employers / Providers) with a real product screenshot mock + 3-bullet pitch each.
9. **FAQ accordion** — five questions (tax treatment, payments, onboarding, languages, security).
10. **Sign-in / sign-up section** — the existing auth card, kept fully functional, lives in its own section near the bottom (anchor `#enter`). Nav "Sign in" smooth-scrolls here.
11. **Footer** — bigger, two columns (brand + sitemap), unchanged copy + © line.

## 3D animation

A real WebGL hero piece using **@react-three/fiber** + **@react-three/drei** (industry-standard, lightweight, plays well with React 19):
- A floating soft-shaded **wallet object** (rounded-cube card stack) slowly orbiting, with three small "perk pills" (a tiny dumbbell, a coffee cup, a luggage tag — built from primitives) gently floating around it.
- Soft studio lighting, contact shadow, subtle drift on mouse position.
- `Suspense` fallback shows a static SVG of the same composition so first paint is instant and SSR doesn't break.
- Wrapped in a client-only mount (no SSR) — keeps build fast and avoids `window` issues.
- Plus a second lightweight 3D moment further down: a **parallax tilt card** of an offer detail UI inside the "For employees" panel — pure CSS 3D transforms reacting to scroll/mouse, no extra library.

## "Expensive web" craft

- **Generous vertical rhythm** — sections breathe; min 120px gaps on desktop.
- **Scroll-triggered fades** — every section uses `IntersectionObserver` to fade-up on entry (no jank, no extra deps).
- **Cursor** — custom subtle ring that grows on hover over links/buttons (cream blend mode over photos).
- **Micro details** — hairline rules with Issue 01 / 02 / 03 labels between sections (editorial framing), tabular numbers for stats, italic serif emphasis on accent words.
- **Soft grain overlay** — barely-there noise texture over hero and editorial spreads for printed-magazine feel.
- All within the existing tokens: cream / ink / ink-soft / accent-red / sage / accent-orange. No purple gradients, no glassmorphism cliches.

## Dependencies

- `three`, `@react-three/fiber`, `@react-three/drei` (only client-side import on landing).
- No motion library needed — IntersectionObserver + CSS transitions handle entrance animations, and r3f handles the 3D drift.

## Files

- `src/routes/index.tsx` — restructured into the long-scroll composition above; auth logic kept intact (form, demo accounts, redirect).
- `src/components/landing/Hero3D.tsx` *(new, client-only)* — r3f wallet + floating perks scene with SVG fallback.
- `src/components/landing/Marquee.tsx` *(new)* — provider ticker.
- `src/components/landing/HowItWorks.tsx` *(new)* — pinned triptych with progress line.
- `src/components/landing/BentoGrid.tsx` *(new)* — 6-tile value-prop grid.
- `src/components/landing/CountersStrip.tsx` *(new)* — animated number counters.
- `src/components/landing/AudiencePanels.tsx` *(new)* — three alternating panels with tilt card.
- `src/components/landing/FAQ.tsx` *(new)* — accordion.
- `src/components/landing/CursorRing.tsx` *(new)* — custom cursor (desktop only).
- `src/components/landing/useReveal.ts` *(new)* — shared IntersectionObserver hook.

## Notes

- The 3D scene is the single hero animation — one well-timed moment beats scattered effects.
- Mobile: the 3D scene is replaced with the SVG fallback (no GPU cost on phones); marquee and counters still play.
- The whole page stays on the cream background; only the audience panels alternate to ink for contrast.
- Existing routes, auth, and brand tokens stay untouched.