# Simplify the employer Overview tab

The Overview today shows 6 KPI tiles, 2 charts, 3 leaderboard/activity columns, an AI insight panel, and an approval-rate card — too much. Strip it down to what an employer actually needs at a glance.

## New Overview (in order)
1. **Header**: greeting + period switcher only. Drop the long "How your team is spending…" headline.
2. **Three KPI tiles** (not six) in one row:
   - Pending approvals (clickable → jumps to Approvals tab)
   - Wallet utilization % (with budgeted total as hint)
   - Active employees (this period)
3. **One chart tile**: spend trend over the selected period. Drop the category donut from Overview.
4. **Pending approvals shortcut**: a single tile listing up to 3 pending requests inline with Approve / Reject actions; "See all" link → Approvals tab. If none pending, show a quiet "All clear" state.
5. **AI insight tile**: kept, but slimmer — one column, no side approval-rate card.

## Cut from Overview
- Category donut, Top providers, Top employees, Activity feed, Approval-rate card, Avg-ticket / Total-committed / Approved-count tiles.
- Keep all the underlying computations (they still feed Approvals tab / future Analytics) but stop rendering them on Overview.

## Navigation
- Pending KPI tile and the pending list's "See all" both call `setTab("approvals")` for one-click drill-in.
- Tabs bar stays as-is (Overview / Approvals / Employees).

## Files
- Edit only `src/routes/_authenticated/employer.tsx` — restructure the `tab === "overview"` branch. No backend, no schema, no other pages touched.

## Out of scope
- Approvals and Employees tabs (unchanged).
- Adding a separate Analytics tab (can come later if you want the removed charts back).
