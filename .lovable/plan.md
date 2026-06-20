## Goals

1. **Quests** — new employer tab where companies complete quests to earn **discount points** spent on platform-fee discounts.
2. **Plans & billing** — Starter / Growth / Enterprise subscription for companies, simulated payment.
3. **Floating AI chatbot** — bottom-left bubble on every employee page; delete `/concierge` route.
4. **Cart icon** — top-right of header (replaces text tab on desktop and `ShoppingBag` slot on mobile bottom bar).
5. **Provider AI** — inline "Generate description", "Suggest price", "Suggest category" buttons inside `OfferEditSheet`.

---

## 1. Quests (employer tab)

**Data (migration)**
- `public.quest_definitions` (seeded, read-only-ish): `slug text pk`, `title`, `description`, `points int`, `target int`, `metric text` — e.g. `employees_onboarded`, `requests_approved`, `policy_configured`, `first_topup`, `monthly_active`.
- `public.company_quests`: `id`, `company_id fk companies`, `quest_slug fk quest_definitions`, `progress int default 0`, `completed_at timestamptz`, `claimed_at timestamptz`, unique `(company_id, quest_slug)`.
- Add `companies.discount_points int not null default 0`.
- RLS: SELECT/UPDATE on `company_quests` and SELECT on `quest_definitions` for `has_company_role(uid, company_id, 'employer_admin')`. Standard grants.

**Server fn** `src/lib/quests.functions.ts`
- `claimQuest({ companyId, slug })` — validates `progress >= target`, sets `claimed_at`, adds `points` to `companies.discount_points`. Idempotent.
- `recomputeQuests({ companyId })` — recalculates `progress` for each quest from live counts (employees, approved requests, has policy set, etc.). Called on tab open.

**UI** `src/components/employer/QuestsTab.tsx`
- Header strip: big "Discount points: 1,240" + "Redeem" button (opens dialog → applies `points → % off next invoice` on the Billing tab as a credit line).
- Grid of quest cards: title, description, progress bar (`progress/target`), "+N pts" pill, **Claim** button when complete.
- Tab registered as `"quests"` in `employer.tsx`.

---

## 2. Plans & Billing (employer tab)

**Data (migration)**
- Add to `public.companies`: `plan text not null default 'starter'` (check in `'starter','growth','enterprise'`), `plan_period text not null default 'monthly'`, `plan_renews_at timestamptz`, `plan_seats int`.
- `public.company_invoices`: `id`, `company_id`, `amount_all int`, `discount_points_applied int default 0`, `status text` (`paid|pending`), `period_start`, `period_end`, `created_at`. RLS: employer_admin SELECT, server fn writes.

**Server fn** `src/lib/billing.functions.ts`
- `changePlan({ companyId, plan, period })` — updates plan + renewal, creates a simulated `company_invoices` row, optionally deducts `discount_points` (1 pt = 1 ALL off, capped at 50% of amount).
- `applyPointsToInvoice({ invoiceId, points })`.

**UI** `src/components/employer/BillingTab.tsx`
- Plan grid (3 cards, monthly/yearly toggle):
  - **Starter** — up to 10 employees, basic policy, community support — 0 ALL.
  - **Growth** — up to 50 employees, analytics, auto-approve, priority support — 49,900 ALL/mo.
  - **Enterprise** — unlimited, SSO, custom policy, dedicated CSM — "Contact sales" (still allows simulated activation).
- Current plan highlighted; "Switch plan" triggers `changePlan` with a confirm.
- Invoice history table with downloadable (just printable) rows; shows points applied.
- Sticky "Apply discount points" widget linked to Quests.

Tab registered as `"billing"` in `employer.tsx`.

---

## 3. Floating AI chatbot (replaces /concierge)

- Delete `src/routes/_authenticated/concierge.tsx`. Remove "Concierge" nav link in `AppShell.tsx`.
- New `src/components/ConciergeBubble.tsx`:
  - Fixed `bottom-6 left-6 z-50` round button (sparkle/chat icon — generated logo, not lucide `Sparkles` per chat-ui rules) on every authenticated employee route.
  - Opens a 380px × 560px floating panel (Popover/Dialog-like, draggable not required) with AI Elements composition: `Conversation`, `Message`, `MessageResponse`, `PromptInput`, `Shimmer`.
  - Uses `useChat` + `DefaultChatTransport({ api: "/api/chat" })`, **no persistence** — messages live in component state, "New chat" clears. (Matches user choice: fresh per session.)
  - Reuses existing `/api/chat` route and offer-search tool already wired; "Add to cart" buttons still work.
- Mount in `AppShell.tsx` only when `isEmployee`.
- Remove `<NavTab to="/concierge">` and any other references; update `routeTree.gen.ts` regenerates automatically.

---

## 4. Cart as top-right icon

- In `AppShell.tsx`:
  - Desktop nav: remove the `Cart · N` text tab; in the right-side button cluster (before profile avatar) add a `Link to="/cart"` with `ShoppingBag` icon + badge bubble for `cartCount`.
  - Mobile bottom bar: replace the cart slot with **Saved** (or keep Saved + drop one of the lesser-used tabs) so the bottom bar reads Home / Marketplace / Saved / Requests. Cart is accessed from the same top-right icon (visible on mobile too).
- Top-right order becomes: language, **cart icon w/ badge**, profile avatar.

---

## 5. Provider AI assists (inline only)

`src/lib/provider-ai.functions.ts` — three `createServerFn`s, all `.middleware([requireSupabaseAuth])`, using Lovable AI Gateway (`google/gemini-3-flash-preview`) with `generateText` + `Output.object` Zod schemas:

- `generateOfferDescription({ title, category, providerName })` → `{ description: string }` (~60–90 words, warm marketing tone).
- `suggestOfferPrice({ title, category, description, city })` → `{ priceAll: number, rationale: string }` — reads a few comparable `offers` server-side for grounding.
- `suggestOfferCategory({ title, description })` → `{ categorySlug: string, confidence: number }` constrained to existing `categories.slug` values.

**UI** in `src/components/provider/OfferEditSheet.tsx`:
- Small "✨ AI" button next to the Description textarea → calls `generateOfferDescription`, streams into the field with "Replace / Append / Discard".
- "Suggest" link next to the Price input → fills the input + shows rationale tooltip.
- "Auto-detect" link next to the Category select → sets the select value + confidence chip.
- All buttons disabled while pending; show inline spinner. Errors surface via `toast`.

No floating chatbot on provider side (per user choice).

---

## Out of scope

- Real payment processing (plans simulate).
- Quest auto-trigger events / webhooks (recompute on tab open is enough).
- Employee-facing view of plan tier.
- Persisting concierge chats / cross-device sync.
- Provider-side floating chatbot.
- Translating AI outputs to SQ (English only this pass).

---

## Files

- migrations: quests + billing + `companies.discount_points` + `plan` columns
- `src/lib/quests.functions.ts` (new)
- `src/lib/billing.functions.ts` (new)
- `src/lib/provider-ai.functions.ts` (new)
- `src/components/employer/QuestsTab.tsx` (new)
- `src/components/employer/BillingTab.tsx` (new)
- `src/components/ConciergeBubble.tsx` (new, with AI Elements install)
- `src/components/provider/OfferEditSheet.tsx` (add AI buttons)
- `src/routes/_authenticated/employer.tsx` (register Quests + Billing tabs)
- `src/components/AppShell.tsx` (cart icon top-right, mount ConciergeBubble, drop Concierge nav)
- `src/routes/_authenticated/concierge.tsx` (delete)
