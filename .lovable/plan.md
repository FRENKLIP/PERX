# Talent Edge Insight

Replace the existing "PERX AI · Team insights" card on the Employer dashboard with a sharper, structured "Talent Edge" insight that reads like the example: a single plain-English narrative sentence followed by concrete category-based recommendations.

## What changes

### 1. API: `src/routes/api/insights.ts`
- Switch from free-form `generateText` to structured output (`generateText` + `Output.object`) so the model returns:
  - `headline` (string, 1 sentence) — the "Your team is not asking for X, they are choosing Y." style narrative.
  - `recommendations` (array of 2-3 objects, each `{ category, action, rationale }`) — e.g. `{ category: "wellness", action: "Add two more wellness providers next month", rationale: "Recovery makes up 38% of approvals." }`.
- Server pre-aggregates the request data into per-category totals and counts before prompting the model, so the model sees clean numbers, not raw row dumps. Aggregation buckets reuse the same regex map used in `employer.tsx` (`wellness | travel | learning | food`), with an `other` bucket for the rest.
- System prompt is rewritten for "Talent Edge" voice: concise, comparative ("not X, they are choosing Y"), Tirana/ALL context, no hedging, no bullet-list prose. Model is instructed to ground every recommendation in an observed category share.
- Falls back to a deterministic message if there are fewer than 3 approved requests in the period ("Not enough signal yet — approve a few requests to unlock Talent Edge.").

### 2. Employer page: `src/routes/_authenticated/employer.tsx`
- Replace the existing insight card (the `md:col-span-3 bg-ink text-cream` block around line 352) with a new `TalentEdgeCard` component.
- Change state shape from `insight: string | null` to `insight: { headline, recommendations } | null` plus `period` (passed into the prompt so insights match the selected 7/30/90 day window).
- Auto-fetch once when the overview tab mounts and there is enough data; show a soft skeleton while loading. Keep a "Refresh" button.
- Re-fetch automatically when `period` changes.
- Send the pre-aggregated category mix (the existing `byCategory` and a small derived `recentTitles` sample) in the POST body, not the raw request rows.

### 3. New component: `src/components/employer/TalentEdgeCard.tsx`
- Visual: dark `bg-ink text-cream` card matching the current aesthetic.
- Header strip: small caps "Talent Edge · powered by PERX AI", sparkles icon, period chip ("Last 30 days"), Refresh button.
- Body:
  - Large serif pull-quote rendering `headline` with a leading red quote mark (uses existing `accent-red`).
  - Below, a 2-3 item recommendation list. Each item is a hairline `bg-cream/5` chip: category icon + label on the left, `action` as the main text, `rationale` as muted small text.
- Empty state and loading state handled inside the component.

## Technical details

- Structured output uses the AI SDK pattern: `generateText({ model, output: Output.object({ schema: z.object({...}) }) })`. `zod` is already a project dep (used elsewhere).
- Category mix is computed server-side in the API handler from the request payload so the same regex bucketing lives in one place — extract a tiny shared helper `src/lib/categorize.ts` and import from both the API route and `employer.tsx` (replaces the inline `categoryNames` regex map currently duplicated in `employer.tsx`).
- Auto-fetch uses a `useEffect` keyed on `[tab, period, data?.requests.length]`, guarded by a request-count threshold and an in-flight ref to prevent thrash.
- No DB schema changes. No new tables. No new env vars (reuses `LOVABLE_API_KEY`).

## Files

- `src/routes/api/insights.ts` — rewrite to structured output + server-side aggregation.
- `src/lib/categorize.ts` — new, shared category bucketer.
- `src/components/employer/TalentEdgeCard.tsx` — new card.
- `src/routes/_authenticated/employer.tsx` — wire new state, auto-fetch, mount new card, drop inline regex map.

## Out of scope

- Provider-specific suggestions (we only have category-level signal in the current data model).
- Persisting insights to the database / historical Talent Edge log.
- Localization to Albanian — keeps current English-only copy.
- Changes to the Approvals or Employees tabs.
