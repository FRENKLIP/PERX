## Goal
Add an **Employees** tab to the employer dashboard (`/employer`) where an employer admin can see every employee at their company and edit each one's profile and monthly budget.

## Tab layout

Add a top-of-page segmented switcher: **Overview | Employees**.
- **Overview** = the existing dashboard (stats, charts, pending approvals) unchanged.
- **Employees** = new view.

## Employees view

Card/table list of every profile whose `employer_company_id` is one of the admin's companies. Each row shows:
- Avatar + full name
- Monthly budget (editable inline, ALL)
- Spent this month (sum of approved request totals in the period)
- Utilization bar
- "Edit" button → opens a side sheet

### Edit sheet (per employee)
Editable fields:
- `full_name` (text)
- `avatar_url` (upload to existing storage or paste URL)
- `locale` (sq / en)
- `monthly_budget_all` (integer, ALL, validated 0–10,000,000)
- "Remove from company" button → clears `employer_company_id` (with confirm)

Header strip on the tab:
- Search by name
- Sort by budget / spent / utilization
- Bulk action: "Set budget for all" (applies a single value to every employee in the list)

## Database changes

Currently `profiles` only has `UPDATE` allowed for `auth.uid() = id`. We need employer admins to update their employees' profiles.

Migration:
- Add RLS policy on `public.profiles` for `UPDATE` allowing
  `has_company_role(auth.uid(), employer_company_id, 'employer_admin')`
  in both `USING` and `WITH CHECK`. The `WITH CHECK` also enforces that the new `employer_company_id` is either NULL (remove from company) or still a company the actor admins, so an admin can't reassign an employee to a company they don't control.
- No schema additions — `full_name`, `avatar_url`, `locale`, `monthly_budget_all`, `employer_company_id` already exist on `profiles`.

## Files to touch
- New migration for the `UPDATE` policy on `profiles`.
- `src/routes/_authenticated/employer.tsx` — add tab switcher, lift existing JSX into an "Overview" panel, mount new component for "Employees".
- New `src/components/employer/EmployeesTab.tsx` — list, filters, bulk-set-budget bar.
- New `src/components/employer/EmployeeEditSheet.tsx` — side sheet form, avatar upload via existing `offer-images` bucket (or a new `avatars` bucket if you prefer — say the word).
- Reuse `formatAll`, `StatTile` styles for consistency.

## Out of scope
- Inviting new employees by email (auth admin flow) — not requested.
- Per-employee category limits or weekly budgets.
- Audit log of admin edits.

## Open question
Avatar uploads: reuse the existing private `offer-images` bucket, or create a new public `avatars` bucket? I'll create a new public `avatars` bucket by default since avatars need to render in the UI without signed URLs — tell me if you'd rather keep one bucket.