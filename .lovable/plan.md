# Benefit Passport

After each approved request, the employee earns a "stamp" tied to the offer's category bucket (Wellness, Food, Travel, Learning, Other). The passport is a new page that shows collected stamps for the current month, progress toward a full set, and a "Your month in benefits" recap.

## UX

New route `/_authenticated/passport`:
- Header: "Benefit Passport — <Month Year>" with a stamped-paper aesthetic (cream bg, hairline borders, serif title — matches existing PERX look).
- Stamp grid (4 categories): Wellness, Food, Travel, Learning. Each card shows:
  - Icon + label
  - Count this month (e.g. "3 stamps")
  - Stamped vs un-stamped visual (rotated wax-stamp style when count > 0, faded outline otherwise)
  - Last item redeemed in that category
- "Your month in benefits" recap strip below grid:
  - Total approved requests
  - Total ALL spent
  - Top category
  - Streak text (e.g. "You unlocked 3 of 4 categories")
- Empty state: "No stamps yet — approved requests this month will appear here."

Entry points:
- Add a "Passport" link in the authenticated nav (next to Requests).
- On the redeem page success state, add a small "View in your Passport →" link.

## Data

No schema changes. Derive everything client-side from existing tables:
- `requests` filtered by `employee_id = auth.uid()`, `status = 'approved'`, `created_at >= start of current month`.
- Join `request_items` → `offers` → `categories` to map each request to a category bucket.
- Bucket mapping (category slug/name → passport bucket): wellness/spa/fitness/health → Wellness; food/dining/restaurant/coffee → Food; travel/hotel/transport → Travel; learning/education/books/course → Learning; everything else → Other (shown as a small "+N other" chip, not a main stamp).

Single TanStack Query (`['passport', userId, monthKey]`) running one Supabase select with nested joins, then reduced in memory.

## Files

- `src/routes/_authenticated/passport.tsx` — new route, page component, query, recap.
- `src/components/passport/StampCard.tsx` — single stamp visual.
- `src/lib/passport.ts` — category→bucket mapping + reducer helpers (pure, unit-friendly).
- `src/routes/_authenticated/redeem.$requestId.tsx` — add small link to passport on success.
- Nav component (whichever renders the authenticated top nav links) — add "Passport" entry.

## Out of scope

- Historical months / archive view (only current month for now).
- Sharing / export of the passport.
- Push notifications or animations beyond the stamp reveal.
- Schema changes, new tables, or new RPCs.
