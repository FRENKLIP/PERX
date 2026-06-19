## Goal
Add a **Transfer funds** action to the "Your wallet · this month" widget so an employee can move ALL from their monthly budget to a teammate in the **same employer company**.

## UX
- Small pill button in the top-right of the wallet hero (`Hero3DEmployee`), styled to match (cream/sage hairline pill, `ArrowRightLeft` icon).
- Click → modal dialog:
  1. Search input → live list of teammates (same `employer_company_id`, excluding self) showing name + avatar.
  2. Amount input (ALL), with max = your current remaining.
  3. Optional note (short text).
  4. Confirm → calls RPC, shows toast, invalidates `app-home` query so the remaining number updates.

## Data
New table `public.wallet_transfers` for audit:
- `id uuid pk`, `sender_id uuid`, `recipient_id uuid`, `amount_all int`, `note text`, `company_id uuid`, `created_at timestamptz default now()`.
- GRANTs + RLS: each user can `SELECT` rows where they are sender or recipient. No direct INSERT — only via the function.

New security-definer function `public.transfer_funds(p_recipient uuid, p_amount int, p_note text)`:
- Validates: authenticated, amount > 0, sender ≠ recipient, both share the same non-null `employer_company_id`, sender's `monthly_budget_all` ≥ amount.
- Atomically decrements sender's `monthly_budget_all`, increments recipient's, inserts a `wallet_transfers` row.
- Raises clear exceptions used as toast messages.

## Files
- `supabase/migrations/<ts>_wallet_transfers.sql` — table, grants, RLS, `transfer_funds` function.
- `src/components/TransferFundsButton.tsx` — new component (button + dialog, teammate search, amount, RPC call).
- `src/components/home/Hero3DEmployee.tsx` — render `<TransferFundsButton remaining={remaining} />` in the header row.
- `src/routes/_authenticated/app.tsx` — pass `onTransferred` (invalidate `app-home`) into Hero, or component invalidates via its own `useQueryClient`.

## Out of scope
- No changes to provider/employer flows.
- No scheduling/recurring transfers.
- Pending requests still count as "spent" — transfer only moves the budget cap, not pending orders.
