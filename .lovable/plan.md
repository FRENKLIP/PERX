## Pair Perks — spend together, both win

The first benefits product that turns a perk into a *plus-one*. Nobody else does this because nobody else has thought of benefits as a social object.

### The idea in one screen

When Era goes to add a yoga class or a Mulliri Vjetër lunch to her cart, a small line appears under the offer:

> **Make it a pair perk.** Invite a teammate — when they accept, you each get **+15%** of this perk on the company. *Era → ?*

She taps a teammate (autocomplete of her company's directory). They get a notification: *"Era invited you to Vinyasa Flow at Iron Yoga on Thursday 7pm. Accept and you both get a free smoothie after."* One tap to accept. Both calendars get an event. Both wallets are charged at the matched rate. Both companies' culture pages light up.

Three things make this feel like nothing else on the market:

1. **The company actively rewards togetherness** with a small bonus (15% extra, or a paired add-on the provider donates) — so the choice to invite someone is materially better than going alone.
2. **The provider opts in to pair offers** in exchange for guaranteed pairs of customers (most local gyms/restaurants will pay for that) — so the discount isn't pure HR cost.
3. **Pairs become the company's social graph** — over a quarter, HR can see "who paired with whom" as an anonymized network: who's bridging teams, who's isolated, where culture is actually happening.

### What changes for each role

**Employee (`/app`, `/marketplace`, cart)**
- Every offer card gets a small "Pair perk" affordance when the provider has opted in.
- Cart line gets a "+ Invite someone" pill. Teammate picker (search profiles in the same `employer_company_id`). State: invited / accepted / declined / expired.
- New `/pairs` tab: incoming invitations, your sent invitations, upcoming paired bookings, history.
- After a paired redemption, both employees see a tiny shared receipt: "You and Ana — Iron Yoga, Thursday. Bonus: 1 smoothie each."

**Employer (`/employer`)**
- New "Pair perks" KPI: pairs formed this month, % of all redemptions, top bridging employees (those pairing across teams).
- "Pair budget" lever: HR sets the bonus % the company will fund per pair (default 15%, off, or capped at €X/employee/month).
- Anonymized "team graph" — nodes are departments, edges are pair count. A simple force-directed view (no fancy dep needed; we already have d3-ish patterns or can hand-roll SVG).

**Provider (`/provider`)**
- On any offer: toggle "Available as pair perk." Choose the pair bonus they fund (e.g. free smoothie, +1 class for the inviter, 2-for-1 main).
- Dashboard row: pairs booked this month, projected vs. solo redemptions.
- This is the pitch line: *"Listing on PERX gets you customers in pairs."*

### Why this is defensible

Existing benefits platforms (Sodexo, Edenred, Benify, Ticket Restaurant, Pluxee, Wolt at Work) are individual wallets. They cannot ship pair perks without:
- A directory layer that respects company boundaries (we have `employer_company_id`),
- Provider-side opt-in tooling (we already have a provider portal),
- An employer-funded matching budget that's not double-billed (we already split spend in `requests`/`offer_providers`).

We have all three. They don't.

### Build slice (MVP, ~1 week)

**Schema (one migration)**
- `pair_invitations` — `id, offer_id, inviter_id, invitee_id, employer_company_id, provider_company_id, status ('pending'|'accepted'|'declined'|'expired'), bonus_pct, bonus_note, scheduled_at, expires_at, accepted_at, created_at`. RLS: inviter and invitee can SELECT; inviter can INSERT; invitee can UPDATE only status. GRANTs for authenticated + service_role.
- `offers.pair_enabled boolean default false`, `offers.pair_bonus_note text`, `offers.pair_bonus_pct int default 15`.
- `requests.pair_invitation_id uuid` nullable — links a redemption to its pair so the employer KPI can count it.
- DB function `accept_pair_invitation(_id uuid)` (security definer): flips status to accepted, creates two mirrored `cart_items` (one per user) with the pair flag, returns OK. Enforces same `employer_company_id`, offer is still active, not expired.

**Server functions (`src/lib/pairs.functions.ts`)**
- `searchTeammates({ q })` — returns up to 8 profiles in caller's `employer_company_id` (uses `requireSupabaseAuth`, projects `id, full_name, avatar_url` only).
- `createPairInvitation({ offerId, inviteeId, scheduledAt })` — INSERT into `pair_invitations`, default 48h expiry, returns the row.
- `respondToPairInvitation({ id, accept })` — calls the DB function.
- `listMyPairs()` — incoming + outgoing + recent.

**UI**
- `<PairInviteButton offer />` — small pill, opens a sheet with teammate search + optional date picker. Used on offer cards, cart lines, and the map panel.
- `/app` — add a "Pairs" tile under the mood strip when the user has pending invites; otherwise hide.
- New route `src/routes/_authenticated/pairs.tsx` — list view with Accept/Decline.
- Provider offer editor — add the `pair_enabled` + `pair_bonus_note` fields to the existing form.
- Employer dashboard — one new card: "Pairs this month: 14 · bridging 4 teams · €112 bonus spent."

**Notifications**
- Browser toast on accept/decline is enough for v1. A `pair_invitations` realtime subscription on the recipient's home page surfaces a small banner when a new one lands. No email infra needed.

### What this plan deliberately does NOT include

- No public/social leaderboard of pairs (creeps people out, ruins consent).
- No AI matching suggestions in v1 — let the human pick. AI nudges ("you haven't paired with Engineering this month") come later.
- No payment changes — pair bonuses are tracked as a separate `pair_bonus_all` line on the request, funded from the employer's pair-budget envelope. Settlement logic stays identical.
- No cross-company pairs — the directory query is hard-scoped to `employer_company_id`. (Cross-company pairs are a v2 idea for partner companies.)

### Open question before I build

The employer-funded bonus can be either **a flat % (e.g. 15% off both tickets, paid by the company)** or **a provider-funded add-on (e.g. a free smoothie, paid by the provider)** — or both stacked. The first is simpler to ship but spends employer budget; the second is the more innovative pitch to providers but needs them to enter the add-on. I'd ship **both, with the provider add-on optional** so day-one PERX has something to show even when providers haven't filled it in yet. Confirm or I'll go with that default.
