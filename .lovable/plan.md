## Goal
On `/employer`, promote the tab switcher into a sticky sub-bar that sits right under the global top nav, and split **Pending approvals** + recent approvals out into their own **Approvals** tab.

## Tab structure (after)

Sticky bar under the main nav with three pills:

- **Overview** — stats grid, charts, leaderboards, activity, AI insights, approval-rate card. (Pending list and recent approvals are removed from here.)
- **Approvals** — Pending approvals (with Approve / Reject actions), then Recent approvals. Period switcher hides here; date stamps stay.
- **Employees** — existing tab unchanged.

The big page title ("How your team is spending their wellbeing.") stays on Overview only. Approvals gets its own short title ("Approvals · N pending"). Employees keeps its current layout.

## Sticky tab bar

- Wrapped in `<div className="sticky top-[72px] z-30 bg-cream/85 backdrop-blur border-b border-border-soft">` so it sits below the existing sticky `<nav>` (which is `top-0`, ~64–72px tall).
- Tab pills as today (`bg-ink text-cream` for the active one). Adds a small count badge for Approvals when pending > 0.
- The Period switcher moves into the Overview tab content (top-right of the stats row), so it doesn't crowd the sticky bar.

## Files to touch

- `src/routes/_authenticated/employer.tsx`
  - Pull out three tab panels in place: `<OverviewPanel />`, `<ApprovalsPanel />`, plus the existing `<EmployeesTab />`.
  - Move the tab switcher to a sticky wrapper at the top of the page (above the H1 area).
  - Move Pending approvals + Recent approvals JSX into the Approvals panel.
  - Period switcher relocates into Overview.

No new files, no database changes, no other routes touched.

## Out of scope

- Filtering/sorting approvals.
- Bulk approve/reject.
- Notifications when something new lands in Approvals.