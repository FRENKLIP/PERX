## 1. Chatbot to bottom-right

`src/components/ConciergeBubble.tsx`: change `left-6` → `right-6` on bubble button and panel. Keep mobile `bottom-24` (clears bottom nav) and desktop `bottom-6`.

Provider-side variant: mount the same component (provider-flavored system prompt) in provider layout — see §3.

## 2. Employee quests + points system (workers page)

Workers = employees. Their landing is `/app` (`src/routes/_authenticated/app.tsx`).

### Schema (new migration)

- `profiles`: add `discount_points integer NOT NULL DEFAULT 0`.
- `employee_quest_definitions` (seeded, read-only to authenticated):
  - `slug, title, description, points, target, metric, sort_order`.
  - Seeded quests: `complete_profile` (target 1, 100 pts), `first_request` (target 1, 150 pts), `redeem_first` (target 1, 200 pts), `save_five_favorites` (target 5, 100 pts), `write_review` (target 1, 150 pts), `redeem_ten` (target 10, 500 pts).
- `employee_quests` (per-user progress):
  - `user_id, quest_slug, progress, completed_at, claimed_at, updated_at`, unique `(user_id, quest_slug)`.
  - RLS: user can select/insert/update own rows.
- `points_ledger` (audit + cart spend):
  - `user_id, delta, reason ('quest_claim'|'cart_redeem'|'refund'), ref_id, created_at`.
  - RLS: user reads own rows; inserts via server fn only.

All tables get GRANTs (`authenticated` SELECT/INSERT/UPDATE on own; `service_role` ALL), RLS enabled, policies as above.

### Server functions (`src/lib/employee-quests.functions.ts`)

- `recomputeEmployeeQuests()` — middleware `requireSupabaseAuth`. Computes metrics for current user:
  - `complete_profile`: profile has full_name + avatar_url.
  - `first_request` / `redeem_ten`: count of own requests with status approved.
  - `redeem_first`: count of own requests with redeemed_at not null.
  - `save_five_favorites`: count of own favorites.
  - `write_review`: count of own offer_reviews.
  - Upserts `employee_quests` rows, sets `completed_at` when progress ≥ target.
- `claimEmployeeQuest({ slug })` — verifies completed & not claimed, sets `claimed_at`, increments `profiles.discount_points`, inserts `points_ledger` row (`reason='quest_claim'`).

### Cart redemption (`src/lib/cart.functions.ts`)

- Add `applyPointsToCart({ points })` returning a server-computed discount preview (1 pt = 1 ALL, capped at 50% of cart total).
- Extend the existing "submit request" server fn (or add `submitRequestWithPoints({ pointsToUse })`):
  - Validates `pointsToUse ≤ profile.discount_points` and `≤ 50% of total`.
  - Deducts points, writes `points_ledger` row (`reason='cart_redeem'`, `ref_id=request_id`), stores `points_redeemed` + `discount_all` on the request row.
- Migration also adds `requests.points_redeemed integer DEFAULT 0` and `requests.discount_all integer DEFAULT 0`.

### UI

- `src/components/employee/QuestsPanel.tsx` — quest cards (progress bar, points reward, Claim button when ready). Header shows total points balance with coin icon.
- Mount on `/app`: new "Quests" section beneath the existing hero/feed, plus a small points-balance chip in the page header.
- `src/routes/_authenticated/cart.tsx`: add a "Use points" row above totals — slider/input bounded by `min(balance, floor(total*0.5))`, live discount preview, sends `pointsToUse` on checkout. Shows updated balance after submit via toast + query invalidation.

## 3. Provider AI

### Floating bubble (bottom-right, provider-flavored)

- New thin wrapper `src/components/ProviderConciergeBubble.tsx` reusing `ConciergeBubble` internals but passing a provider system prompt (pricing tips, offer ideas, performance Q&A about their own offers).
- Refactor `ConciergeBubble` to accept `variant: 'employee' | 'provider'` and choose system prompt + greeting accordingly. Single component, two mounts.
- `AppShell.tsx`: mount employee variant for employees, provider variant for provider admins. Both positioned bottom-right.

### Dashboard insights panel

- `src/components/provider/AIInsightsCard.tsx` placed on `src/routes/_authenticated/provider.tsx` above the offers table.
- Server fn `generateProviderInsights()` (`src/lib/provider-ai.functions.ts`):
  - Loads provider's offers, last 30 days of `request_items` and `offer_reviews`.
  - Calls `google/gemini-3-flash-preview` with `Output.object` schema: `{ summary, topCategories[], pricingSuggestions[], opportunities[] }`.
- Card shows skeleton → 4 sections. "Refresh" button re-runs. Result cached in TanStack Query for 10 min.

Existing inline AI buttons in `OfferEditSheet.tsx` stay as-is.

## 4. Remove employer Quests tab

- `src/routes/_authenticated/employer.tsx`: remove `"quests"` from tab list and the `<QuestsTab/>` render branch. Default tab stays Employees.
- Delete `src/components/employer/QuestsTab.tsx`.
- Keep `recomputeQuests`/`claimQuest` server fns and `company_quests`/`quest_definitions` tables untouched (still referenced by Billing for company `discount_points` discount on invoices). No data migration.

## Files

Created:
- `supabase/migrations/<ts>_employee_points.sql`
- `src/lib/employee-quests.functions.ts`
- `src/components/employee/QuestsPanel.tsx`
- `src/components/provider/AIInsightsCard.tsx`
- `src/components/ProviderConciergeBubble.tsx` (thin wrapper) — or just reuse via `variant` prop

Updated:
- `src/components/ConciergeBubble.tsx` (right-side position, `variant` prop)
- `src/components/AppShell.tsx` (mount provider bubble; remove left-side positioning)
- `src/routes/_authenticated/app.tsx` (mount QuestsPanel + points chip)
- `src/routes/_authenticated/cart.tsx` (use-points row + checkout wiring)
- `src/lib/cart.functions.ts` (points validation + ledger)
- `src/lib/provider-ai.functions.ts` (add `generateProviderInsights`)
- `src/routes/_authenticated/provider.tsx` (insights card)
- `src/routes/_authenticated/employer.tsx` (drop Quests tab)

Deleted:
- `src/components/employer/QuestsTab.tsx`

## Out of scope

- Real-time quest auto-recompute via triggers (called on `/app` mount + after relevant mutations instead).
- Translating AI outputs to Albanian.
- Provider chatbot persistence (fresh session like employee).
