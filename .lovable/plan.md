
# Multi-provider (co-listed) offers

Today every offer belongs to exactly one provider via `offers.provider_company_id`. We'll keep that column as the **creator/owner**, and add a join table for **co-providers** with revenue-share percentages. At checkout the employee picks one of the attached providers; that provider gets the redemption code and the order is stamped with their split for reporting.

## Data model changes

1. New table `public.offer_providers`
   - `offer_id` (FK offers, cascade)
   - `provider_company_id` (FK companies)
   - `share_pct` int (0–100, default 0)
   - `is_owner` bool (true for the creator row)
   - `accepted_at` timestamptz null (null = invitation pending)
   - `created_at` timestamptz
   - Unique (`offer_id`, `provider_company_id`)
   - Trigger: ensure total `share_pct` across accepted rows ≤ 100.
   - RLS: any provider admin in the row can read; only the owner can insert/delete; an invited provider can update their own `accepted_at`.
   - GRANTs to authenticated + service_role.

2. Backfill: insert one `offer_providers` row per existing offer with `is_owner=true`, `share_pct=100`, `accepted_at=now()`.

3. `request_items` gets two new columns:
   - `fulfilling_provider_id uuid` (which provider was chosen at checkout — already covered by existing `provider_company_id`, so we just repurpose it: keep it as the chosen one).
   - `share_pct_snapshot int` so revenue reports reflect the split at purchase time.

## Provider dashboard (`/_authenticated/provider`)

- New-offer form: after entering details, an "Co-providers" section lets the owner search companies (kind = provider) by name, add them as rows, and set each share %. Owner's share auto-fills to `100 - sum(others)`. Submit creates the offer + N `offer_providers` rows in one call (server fn).
- "Your offers" grid shows offers where the current company is in `offer_providers` (owner or co). A "Co-listed" pill appears when >1 provider; owners see "Manage co-providers"; invitees see "Accept / decline".
- Incoming orders list filters to items where `fulfilling_provider_id = your company`. Revenue stats use `price_all * share_pct_snapshot / 100` for co-listed orders so each provider sees their cut.

## Employee flow

- Offer detail page (`offer.$offerId`): shows a "Available from" row with logos/names of all accepted providers. If >1, a small selector ("Redeem at: …") appears and is required before "Add to cart" / checkout.
- Marketplace card: small "+N venues" badge when an offer has multiple providers.
- Cart / checkout: persists the selected `provider_company_id` per line. The redemption code, on payment, is generated for that provider only.

## Out of scope

- No revenue payouts integration (we already simulate payment). Split is for reporting only.
- No public discovery / opt-in marketplace for providers to find offers — strictly invite-by-name.
- No editing of share % after the offer has paid orders (we just block it in the UI / server fn).

## Files to touch

- DB: one migration (new table, trigger, RLS, GRANTs, backfill, two new `request_items` columns).
- `src/routes/_authenticated/provider.tsx` — new-offer form additions, manage / accept UI, dashboard filtering.
- `src/routes/_authenticated/offer.$offerId.tsx` — provider list + selector.
- `src/routes/_authenticated/cart.tsx` — pass selected provider into request_items, stamp share_pct.
- `src/routes/_authenticated/marketplace.tsx`, `EditorBento.tsx`, `WalletSim.tsx` — "+N venues" badge.
- New server fn `src/lib/offers.functions.ts` (`createOfferWithProviders`, `setShare`, `respondToInvite`).

## Open questions

- Should an invited provider be able to **counter-propose** a share %, or only accept/decline? (Default plan: accept/decline only.)
- For pending invites, should the offer still be live to employees? (Default plan: yes — only accepted providers appear in the "redeem at" list.)
