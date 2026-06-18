# Rebuild the Employer & Provider dashboards

Both dashboards currently have a single hero, three stat tiles, one chart, and a flat list. They're functional but feel thin compared to the employee side. I'll redo both as proper analytics consoles — same editorial aesthetic (cream/ink/serif), new layout, more signal per scroll.

## Employer dashboard (`/employer`)

New hero strip with **6 KPI tiles** (was 3):
- Pending approvals · Approved this month · Total committed (ALL)
- Active employees (distinct `employee_id` count) · Avg. ticket size · Wallet utilization % (approved ÷ summed `monthly_budget_all` for linked employees)

New chart row:
- **30-day spend trend** — area chart of approved totals per day (recharts AreaChart, ink fill with cream gradient).
- **Category mix** — donut chart (kept, but reskinned from bars → donut, with legend + ALL totals per slice).
- **Top providers** — horizontal bar list of the 5 providers receiving the most committed spend, with provider names from `companies`.

New sections:
- **Top employees** — leaderboard of the 5 highest-spending employees this period, fed by joining requests → profiles (anonymized as "Employee · last 4 of id" if name not readable under current RLS).
- **Activity feed** — last 8 events (request submitted / approved / rejected) as a timeline.
- Existing **AI Team insights** card (kept, restyled into the new grid).
- Existing **Pending approvals** queue and **Recent approvals** list (kept, tightened spacing).

## Provider dashboard (`/provider`)

New hero strip with **6 KPI tiles** (was 3):
- Live offers · Paid orders · Revenue (paid) · Pending revenue · Conversion (paid ÷ total orders) · Avg. order value

New chart row:
- **30-day revenue trend** — area chart of paid `price_all` per day.
- **Top offers** — horizontal bar of the 5 best-selling offers (count + revenue), aggregated from `request_items`.
- **Order status mix** — donut of Paid vs Pending.

New sections:
- **Recent redemption codes** — grid of the latest 6 redemption codes with offer title + date (currently buried inline in the orders list).
- **Customer reach** — distinct employer companies served + distinct buyers, two large stat cards.
- **Incoming orders** (kept, restyled with status pill + amount column aligned).
- **Your offers** grid (kept, with a quick "Active / Inactive" toggle on each card that flips `offers.is_active`).
- New-offer form (kept, unchanged).

## Visual & tech notes

- Same design system: `cream/ink/accent-red/sage/accent-orange`, serif headings, `hairline` borders, `fade-up` entrance.
- All new charts use **recharts** (already in the project): `AreaChart` for trends, `PieChart` with `innerRadius` for donuts, `BarChart layout="vertical"` for the leaderboards. Custom tooltips reuse `formatAll()`.
- Both pages get a small **period switcher** (7d / 30d / 90d) wired via `useState` (URL search params aren't needed here since these aren't shareable links).
- All new metrics derived in `useMemo` from the existing `useQuery` payloads — no new tables. Employer query is extended to also pull `profiles` for linked employees (to compute wallet utilization) and `companies` for provider name lookup.
- No schema changes. No new dependencies.

## Files

- `src/routes/_authenticated/employer.tsx` — rewritten
- `src/routes/_authenticated/provider.tsx` — rewritten
- `src/components/StatTile.tsx` *(new)* — shared 6-up KPI tile used by both dashboards
- `src/components/DashboardCharts.tsx` *(new)* — `TrendArea`, `CategoryDonut`, `TopBars` chart primitives shared by both
