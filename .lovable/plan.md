## Perka — Employee Benefits Marketplace

A two-sided marketplace where employees pick benefits, employers approve and fund them, and providers receive routed payments. AI concierge as the hero feature. Albanian Lek + Tirana-focused seed data, architected for any market.

### Tech & stack
- TanStack Start (current scaffold) + Tailwind v4 + shadcn
- Lovable Cloud for auth + Postgres (RLS-protected, role-based)
- Lovable AI Gateway (`google/gemini-3-flash-preview`) for the concierge, called via `createServerFn` with tool calling
- Fonts: Sora (display) + Manrope (body) loaded via `<link>` in `__root.tsx`
- Tokens copied verbatim from the chosen bento direction: `#fefaf3` bg, `#1a1a1a` ink, `#e63946` red, `#f4a261` orange, `[2rem]` radii

### Data model (Lovable Cloud)
- `profiles` (id → auth.users, full_name, locale, currency, avatar_url, active_role)
- `user_roles` (user_id, role: `employee` | `employer_admin` | `provider_admin`) — separate table per security rule, `has_role()` definer fn
- `companies` (id, name, country, currency, kind: `employer` | `provider` | `both`)
- `company_members` (company_id, user_id, role)
- `employee_wallets` (employee_id, company_id, monthly_budget, balance, period_start)
- `categories` (slug, name_en, name_sq, icon)
- `providers` (company_id, name, city, hero_image_url, category, description)
- `offers` (provider_id, title_en, title_sq, description, price_all, category, image_url, is_seasonal, tags[])
- `cart_items` (employee_id, offer_id, qty) — pre-submission
- `requests` (id, employee_id, employer_company_id, status: `pending`|`approved`|`rejected`, total_all, note, ai_package_name)
- `request_items` (request_id, offer_id, provider_company_id, price_all)
- `payments` (request_id, provider_company_id, amount_all, status: `simulated_paid`, paid_at)
- `redemptions` (request_item_id, code, redeemed_at)
- All public-schema tables include explicit GRANTs + RLS policies scoped by `auth.uid()` and `has_role()`.

### Routes
- `/` — public landing (hero, value prop, "Join as employee / employer / provider")
- `/auth` — sign in / sign up (email+password + Google); on signup, pick role + seed demo data
- `/_authenticated/app` — employee bento home (chosen direction)
- `/_authenticated/marketplace` — full offer browse, filter by category, sort
- `/_authenticated/offer/$offerId` — offer detail + add-to-cart
- `/_authenticated/cart` — review selection, see wallet impact, submit for approval
- `/_authenticated/requests` — employee's request history with statuses + redemption codes
- `/_authenticated/concierge` — full AI chat (also available as inline widget on home)
- `/_authenticated/employer` — employer dashboard: pending approvals, team usage insights, AI-generated summary
- `/_authenticated/employer/approvals/$id` — approve/reject single request, routes simulated payments
- `/_authenticated/provider` — provider dashboard: incoming orders, payouts, offer management
- `/_authenticated/provider/offers/new` — create offer
- `/_authenticated/settings` — language toggle (EN/SQ), role switcher if user has multiple

### Core flow (the demo loop)
1. Employee browses bento home, opens AI concierge chat ("find me something relaxing under 8000 ALL")
2. Concierge returns recommended offers + an optional smart package; employee adds to cart
3. Employee submits cart → creates `request` (status `pending`), employer notified
4. Employer opens approvals → approves → server fn creates `payments` rows per provider (simulated), updates wallet balance, generates redemption codes, marks request `approved`
5. Employee sees confirmation + codes; provider sees order in their dashboard

### AI features (Lovable AI Gateway)
- **Concierge chat** (`/concierge`): streaming `useChat` → `/api/chat` server route. System prompt knows wallet balance, categories, offers; uses **tool calling**:
  - `search_offers({ query, max_price_all, category })`
  - `build_smart_package({ goal, budget_all })` returns 2–4 complementary offers
  - `add_to_cart({ offer_ids })`
- **Employer insights** (`/employer`): one-shot `createServerFn` summarizes team usage into a short paragraph + top 3 recommendations.
- **Daily picks** chip on home: a server fn returns 3 AI-curated picks based on past requests.

### Engagement & stickiness
- Bento home with personal greeting (with Albanian flavor: "Mirëmëngjes, Era")
- Seasonal drops ribbon (marquee) — limited-time offers
- Streak indicator: "you've explored X weeks in a row"
- "Smart package" hero tile (AI-curated)
- Wallet progress + tax-savings tally
- i18n: EN default, SQ toggle (small dictionary file, `useLocale` hook, formatted ALL currency)

### Seed data (migration)
- 1 employer company "Gjirafa Tech" with 25,000 ALL monthly wallet
- 1 provider company per category (Iron Gym Tirana, Mullixhiu, Dhërmi Escape, Coursera Plus, Hygeia Spa, Vodafone, Dajti Ekspres, etc.) — ~18 offers total
- 3 demo accounts auto-seeded via auth admin: `employee@perka.demo`, `employer@perka.demo`, `provider@perka.demo` (password shown on /auth page for judges)
- Categories localized en+sq

### Build order
1. Enable Lovable Cloud + LOVABLE_API_KEY
2. Design tokens in `src/styles.css` + Sora/Manrope link in `__root.tsx`
3. Migration: schema + GRANTs + RLS + `has_role` + seed
4. Auth scaffolding (`/auth`, `_authenticated/route.tsx`) + role-based redirect
5. Shared layout (top nav with wallet pill + role switcher)
6. Employee bento home + marketplace + cart + request submission
7. Employer approvals + simulated payment server fn
8. Provider dashboard (read-only orders + offer create)
9. AI concierge chat with tool calling + `/api/chat` route
10. Employer AI insights + daily picks
11. i18n toggle + polish + seasonal marquee + streak

### Out of scope (acknowledged)
- Real payment rail (simulated only — payment row + redemption code)
- Email notifications
- Mobile-native; responsive web only
- Multi-currency UI beyond ALL placeholder (architecture supports it; only ALL seeded)

Ready to build when you approve.