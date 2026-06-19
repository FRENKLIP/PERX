## Goal
Turn an **approved request** into a tangible, real-world redemption experience: a beautiful screen with a QR code, redemption instructions, provider map, and a shareable calendar invite — so PERX feels complete the moment the user walks into the café/gym/spa.

## UX

New route: `/_authenticated/redeem/$requestId`

Layout (single full-height "ticket" feel, matches existing serif + cream/sage palette):

```text
┌──────────────────────────────────────────────────┐
│  APPROVED · #A4F2  ·  Hani Hane café             │  ← header strip
│  Macchiato + croissant                            │
│                                                   │
│   ┌─────────────────┐    Show this at the counter│
│   │                 │                              │
│   │   ░░ QR CODE ░░ │    Redemption code         │
│   │                 │    PERX-A4F2-9KQ           │
│   └─────────────────┘                              │
│                                                   │
│   Status: ● Ready to redeem                       │
│   [ Mark as redeemed ]   [ Add to calendar ]      │
│                                                   │
│   ── Provider instructions ──                     │
│   "Show this screen to staff. Valid Mon–Sat."     │
│                                                   │
│   ── Getting there ──                             │
│   📍 Rr. Myslym Shyri 22, Tiranë                  │
│   [ small map preview with pin ]                  │
│   [ Open in Google Maps ↗ ]                       │
│                                                   │
│   ── Items ──                                     │
│   • Macchiato        500 ALL                      │
│   • Croissant        300 ALL                      │
└──────────────────────────────────────────────────┘
```

Entry points:
- On **Requests** page (`/requests`), each approved request row gets a "Redeem" button → opens this screen.
- The post-approval toast / approval email (future) can link straight here.

## Data

Add a few columns to `public.requests` (one migration):
- `redemption_code text unique` — short human-friendly code, e.g. `PERX-A4F2-9KQ`, generated on approval.
- `redeemed_at timestamptz` — set when the user (or provider) marks redeemed.
- `redeemed_by uuid` — who marked it.

Backfill: generate `redemption_code` for existing approved rows in the same migration.

A trigger on `requests` fills `redemption_code` automatically when `status` flips to `approved` and the column is null. Keeps the employer-approval flow untouched.

New SECURITY DEFINER function `public.mark_request_redeemed(p_request_id uuid)`:
- Caller must be either the request's `employee_id` or a `provider_admin` of one of the request's `request_items.provider_company_id`s.
- Sets `redeemed_at = now()`, `redeemed_by = auth.uid()`. Idempotent (no-op if already set).

No new tables. RLS: existing `requests` policies already let the employee read their own request and provider admins read items routed to them — extend the existing SELECT policy on `requests` to also allow provider admins of any line item to read the parent row (needed so a provider can scan the QR and load the screen).

## Files

- `supabase/migrations/<ts>_redemption.sql` — columns, generator function, trigger, backfill, `mark_request_redeemed`, policy tweak.
- `src/routes/_authenticated/redeem.$requestId.tsx` — the redemption screen (loader-fetched via `useQuery`).
- `src/components/redeem/RedemptionCard.tsx` — QR + code + status + actions (renders QR with the existing-or-newly-added `qrcode` lib; we'll add `qrcode` via `bun add qrcode`).
- `src/components/redeem/ProviderMapMini.tsx` — reuses `TiranaMap` styling, single pin from `companies.lat/lng` (already in schema based on `TiranaMap`); falls back to address-only card if no coords.
- `src/lib/ics.ts` — tiny helper that builds an `.ics` calendar invite (title = offer title, location = provider address, 1-hour default block starting "today 7pm" or user-picked time) and triggers a download.
- `src/routes/_authenticated/requests.tsx` — add **Redeem** link on approved rows.

## Out of scope
- Provider-side scanner UI (provider can still open the same `/redeem/$id` URL and tap "Mark redeemed"; a camera scanner is a separate feature).
- Push/email reminders.
- Multi-visit punch cards or partial redemptions — redemption is all-or-nothing per request for now.
- Wallet pass (Apple/Google Wallet) export — the `.ics` invite covers calendar; wallet pass is a follow-up.

## Technical notes
- QR payload = absolute URL `https://<host>/redeem/<requestId>?c=<redemption_code>` so a provider scanning with any phone camera lands on the same screen and can mark it redeemed (after login as a provider admin of that offer).
- `qrcode` runs client-side only; no server dependency.
- `.ics` is generated on the client as a `Blob` and downloaded — no server route needed.
- `mark_request_redeemed` is called via `supabase.rpc(...)`; invalidates `["request", id]` and `["requests"]`.
