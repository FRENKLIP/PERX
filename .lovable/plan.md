# Whole-site redesign — modern, clean, 3D-forward

## Direction lock
- **Palette**: keep current cream/paper/ink/red/sage. **Drop orange** (`--color-accent-orange`) everywhere. Red becomes the single warm accent; sage is the cool counterpoint; ink/cream/paper carry surfaces.
- **Type**: Sora (display) + Manrope (body). Already wired — enforce consistently, remove Instrument Serif decorative drops unless intentional.
- **Layout backbone**: bento grid. Every section that today is a stacked row becomes a tile composition with mixed sizes, hairline borders, generous whitespace, and one expressive tile per section.
- **3D scope**: recurring across landing, employee app, employer, provider, and key CTAs. Each scene is *purposeful* (continues the cash-stack metaphor or shows real product data) — no abstract floaters.

## Visual system updates (`src/styles.css`)
- Remove `--color-accent-orange` and replace usages with `--color-accent-red` or `--color-sage`.
- Add tokens: `--color-ink-2` (#2a2a28), `--radius-tile` (20px), `--shadow-tile` (0 1px 0 #17171710, 0 20px 40px -24px #17171720), `--grain` overlay utility.
- New utilities: `.tile` (cream surface, hairline, radius-tile, shadow-tile), `.tile-dark` (ink surface, cream text), `.tile-accent` (red), `.bento` (CSS grid 12-col, auto-flow dense, gap-3).
- Refined motion: shared `--ease-out-expo`, add `.reveal` (IntersectionObserver fade+rise), `.hover-lift` (translateY -2px + shadow grow).
- Drop Instrument Serif import unless still used; keep bundle lean.

## Landing page (`src/routes/index.tsx` + `src/components/landing/*`)
Rebuild as a bento composition, top to bottom:
1. **Hero bento** — left tile: oversized Sora wordmark + value prop + auth CTA. Right tile: existing `Hero3DScene` reskinned to the cash-stack metaphor (banknote stack representing the average ALL budget per employee, breathing). Below: 3 small tiles (counters, "How it works in 30s", logo marquee).
2. **How it works** — 4 bento tiles, each with a small 3D vignette: (a) employer funds → coin tower, (b) employee picks → mini cash stack peeling, (c) provider redeems → pin dropping on map, (d) tax saved → ledger card flipping.
3. **Audiences** — 3 tall tiles (Employees, Employers, Providers), each with a subtle 3D motif and a single CTA.
4. **Bento feature grid** — repurpose existing `BentoGrid` with the new tile system, real screenshots in tiles.
5. **FAQ + footer** — quiet, hairline tiles.

Replace orange gradients/buttons with red; convert section dividers to hairlines.

## 3D scenes (recurring language)
- **Shared scene kit** (`src/components/three/`): extract `CashStack`, `CoinTower`, `MapPin`, `LedgerCard`, `BudgetRing` as small reusable `<Canvas>` islands with `dpr={[1,1.5]}`, ambient parallax, no click interaction (matches earlier "ambient low-CPU" decision).
- **Landing hero**: cash-stack (already built) — reskin notes to PERX cream/ink with red band.
- **Employee `/app` hero**: keep the live cash stack (already tied to WalletSim picks).
- **Employer `/employer`**: replace any decorative header with a coin-tower scene whose height = `funded - spent`, plus a small ledger card flipping on approvals.
- **Provider `/provider`**: map-pin scene with pins scaled by redemption count this week.
- **Offer detail**: a small floating "ticket" 3D card in the header.
- All scenes share lighting, materials, and motion timing so they read as one language.

## Page-by-page bento refactor
- `/app` (employee home) — convert `EditorBento`, `WalletSim`, `ProviderMapPanel`, `MoodPicker`, `WeeklyMarquee` into a 12-col bento where the cash-stack scene occupies a hero tile and the rest are sized tiles around it.
- `/marketplace` — filters become a left sticky tile; offer cards become uniform bento cards with hairlines, no orange chips.
- `/employer` — KPI tiles + coin-tower hero tile + tabs (Overview / Employees / Approvals) styled as bento.
- `/provider`, `/cart`, `/saved`, `/requests`, `/concierge` — same tile language, no per-page bespoke chrome.
- Shared `AppShell` topbar: thinner, hairline border, Sora wordmark, remove orange hover states.

## Components touched (high level)
- Edit: `src/styles.css`, `src/routes/index.tsx`, `src/routes/_authenticated/*.tsx`, `AppShell.tsx`, all `src/components/landing/*`, all `src/components/home/*`, `src/components/employer/*`.
- Add: `src/components/three/{CashStack,CoinTower,MapPin,LedgerCard,BudgetRing,SceneCanvas}.tsx`, `src/components/ui/Tile.tsx`, `src/components/ui/Bento.tsx`.
- Remove orange usages project-wide (grep `accent-orange`, `#d98b5f`, orange gradient classes).

## Out of scope (this pass)
- No backend / schema / auth changes.
- No new routes or features — purely visual + 3D reskin.
- No photoreal textures; 3D stays stylized matte to match the editorial palette.
- Mobile uses static poster images for heavy 3D tiles to stay performant.

## Verification
- Build passes, no orange tokens left (`rg accent-orange`).
- Visit `/`, `/app`, `/employer`, `/marketplace`, `/provider` in preview; confirm bento layout + 3D scenes render.
- Lighthouse perf budget: 3D canvases lazy-mount via IntersectionObserver.
