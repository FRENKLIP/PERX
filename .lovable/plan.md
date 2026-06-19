## Goal

Replace the standalone Passport tab with a Profile panel that opens when the user taps their avatar (PFP) in the top nav / bottom bar. The panel shows the user's profile details and the full Benefit Passport content inline.

## Changes

### 1. New component `src/components/ProfileDrawer.tsx`
Right-side slide-over (Sheet-style, built with a plain fixed overlay to match the current minimalist style — no new deps). Sections, top to bottom:

- **Identity header** — large avatar (initials), full name, email, language, role badge (Employee / Employer / Provider), company name if available, sign-out button.
- **This month** — same recap strip currently on the Passport page (Approved, Spent, Top category, Unlocked).
- **Benefit Passport** — the four `StampCard`s in a 2-col grid, plus the "+ N other benefits" line and empty state. All logic moved out of the route file into this component (same query, same `summarize`).
- Footer link "Browse the marketplace" closes the drawer.

Closes on: backdrop click, Esc, route change, or sign-out.

### 2. `src/components/AppShell.tsx`
- Convert the avatar `div` into a `button` that toggles the drawer open. Add a subtle ring on hover. Keep initials styling.
- Remove the `/passport` `NavTab` (desktop) and the `Stamp` `BottomTab` (mobile).
- Render `<ProfileDrawer open={...} onClose={...} ctx={ctx} />` at the shell root so it works on every page.
- Keep the language toggle and sign-out icons where they are (drawer also has sign-out, both are fine).

### 3. `src/routes/_authenticated/passport.tsx`
- Keep the route file but make it a thin redirect to `/app` (so any existing `/passport` link or the success-page deep link still lands somewhere sensible). Alternative: delete the file and update the "View in your Passport →" link on `redeem.$requestId.tsx` to open the drawer instead. **Chosen:** delete the route and replace the success-page link with a normal link to `/app` plus copy "Open your profile to see your Passport" — the drawer is the only entry point, matching the user's intent.

### 4. `src/routes/_authenticated/redeem.$requestId.tsx`
Update the "View in your Passport →" link to point to `/app` with the new copy above. (No drawer auto-open wiring — keeps scope tight.)

### 5. Files unchanged
`src/lib/passport.ts` and `src/components/passport/StampCard.tsx` are reused as-is by the drawer.

## Out of scope
- Editing profile fields (name, avatar upload) — display only.
- Animations beyond a simple fade/slide.
- Persisting drawer open state across reloads.
- Auto-opening the drawer from the redeem success page.

## Technical notes
- Drawer is a controlled component in `AppShell` using `useState`. No router state, no URL change.
- Query key stays `["passport", monthStart]` so the data is shared if both the drawer and any other consumer mount.
- Role detection reuses the existing `ctx.roles` already fetched in `AppShell`.
