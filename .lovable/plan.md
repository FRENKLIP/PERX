## Goal

Give employer admins a **Policy** control room with four levers that actually shape what employees can submit and how requests get decided:

1. **Max request amount** — caps `total_all` per request at submit time.
2. **Allowed categories** — restricts which `category_slug`s can appear in a request.
3. **Auto-approve below threshold** — requests with `total_all ≤ threshold` (and within rules) skip manual review and are immediately marked approved + paid.
4. **Monthly budget default** — used when seeding new employees and when an employer admin uses "Reset to default" on an employee.

---

## 1. Data model (migration)

Add to `public.companies` (employer rows only; ignored for `kind='provider'`):

- `policy_max_request_all int` — null = no cap.
- `policy_allowed_categories text[]` — null/empty = all categories allowed.
- `policy_auto_approve_below_all int` — null/0 = off.
- `policy_default_monthly_budget_all int NOT NULL DEFAULT 25000`.

No new table, no RLS changes (companies already public-read; updates restricted via existing employer-admin policies… we'll verify and add one if missing — `companies` currently has only public SELECT, so add an UPDATE policy: `has_company_role(auth.uid(), id, 'employer_admin')`).

---

## 2. Server function: `submitCartRequest` (replaces inline cart insert)

Today `cart.tsx` does the insert client-side. RLS lets the employee insert any `total_all` and any categories, so policy enforcement must move server-side.

New `src/lib/cart.functions.ts` with `submitCartRequest`:

- `.middleware([requireSupabaseAuth])`.
- Reads cart_items + offers + the employee's `employer_company_id` + the employer's policy columns.
- Validates:
  - `total_all <= policy_max_request_all` (if set) — else throw with a clear message.
  - Every line's `category_slug` is in `policy_allowed_categories` (if set) — else throw with the offending titles.
- Inserts the request + items (same logic as today's `cart.tsx`).
- If `total_all <= policy_auto_approve_below_all` (and >0): immediately set `status='approved'`, `decided_at=now()`, `decided_by=employee_id` (system auto), and mark all items `payment_status='simulated_paid'` with redemption codes. Returns `{ requestId, autoApproved: boolean }`.
- Clears cart_items for the user.

`cart.tsx` calls it via `useServerFn`. Toast becomes "Auto-approved · payment routed" when applicable, and the user is sent to `/redeem/$requestId` instead of `/requests` in that case.

---

## 3. UI: new **Policy** tab in employer console

Add `"policy"` to the tab union in `src/routes/_authenticated/employer.tsx`. Tab content lives in a new `src/components/employer/PolicyTab.tsx`:

- **Spending limits** card
  - Number input "Max per request (ALL)" with clear/empty = no cap.
  - Number input "Auto-approve below (ALL)" with helper "Requests at or under this amount skip manual review."
- **Allowed categories** card
  - Checkbox grid of all `categories` rows. Empty selection = all allowed.
- **Employee defaults** card
  - Number input "Default monthly budget (ALL)" — applies to new employees and the "Reset to default" action.
  - Secondary action: "Apply default to all employees now" (bulk `UPDATE profiles SET monthly_budget_all = default WHERE employer_company_id = X`). Confirm modal.
- Save bar (sticky bottom of card): "Discard" / "Save policy".

All loaded from `companies` row for `companyIds[0]`. Save via supabase client (employer admin RLS update policy added in step 1).

---

## 4. Employee-side surfacing (light touch)

- `cart.tsx`: if cart total exceeds employer cap, show an inline warning and disable "Send to employer".
- `cart.tsx`: line items in a disallowed category get a small "Not allowed by your employer" pill, and submit is blocked until removed.
- `marketplace.tsx`: out of scope to filter the grid — keep scope tight; the cart check is enough.

---

## 5. EmployeesTab tweak

Add a "Reset to default" button per employee row that sets `monthly_budget_all = policy_default_monthly_budget_all`. Already permitted by existing profile update policy.

---

## Files

- migration (companies columns + UPDATE policy)
- `src/lib/cart.functions.ts` (new)
- `src/routes/_authenticated/cart.tsx` (swap insert → server fn, add validation UI)
- `src/components/employer/PolicyTab.tsx` (new)
- `src/routes/_authenticated/employer.tsx` (register tab)
- `src/components/employer/EmployeesTab.tsx` (Reset to default button)

---

## Out of scope

- Per-category caps (e.g. wellness max 5k). Just one global cap.
- Per-employee policy overrides.
- Approval workflows beyond a single threshold (no multi-step approvers).
- Filtering marketplace by allowed categories.
- Notifying employees when policy changes.
- History/audit log of policy edits.

---

## Technical notes

- Policy enforcement is **server-side only**. Client checks are UX hints; the server fn is the source of truth so a malicious client can't bypass.
- Auto-approve uses `decided_by = employee_id` (so the existing `decided_by` FK stays valid) and a new `note` suffix `"[auto-approved]"` so it's visible in approval lists if needed later — alternative: add `auto_approved boolean` column. **Chosen:** keep it simple with no new column; UI shows "Auto-approved" when `status='approved' AND decided_by = employee_id`.
- The `fill_redemption_code` trigger already populates `requests.redemption_code` on status→approved; the server fn relies on it.
