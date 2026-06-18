## Goal
Make `/` the single front door: editorial hero on the left, sign-in / sign-up form on the right, demo accounts and benefits copy folded in. Remove the standalone `/auth` route.

## Layout

```text
┌─────────────────────────────────────────────────────────────┐
│ PERX.                                  Already a member? ↓  │
├──────────────────────────────┬──────────────────────────────┤
│  Issue 01 · Tirana, 2026     │  Sign in  /  Create account  │
│                              │                              │
│  Benefits that *feel* like   │  [ Full name ] (signup)      │
│  a Friday in Blloku.         │  [ I'm joining as ▸ 3 chips ]│
│                              │  [ Company / Business name ] │
│  Tax-efficient gyms, meals,  │  [ Email ]                   │
│  weekends and courses…       │  [ Password ]                │
│                              │                              │
│  [hero image card · Komiteti]│  ▶ Sign in / Create account  │
│                              │  ─── try a demo ───          │
│  For employees · employers · │  · Employee  · Employer      │
│  providers (3 mini rows)     │  · Provider                  │
└──────────────────────────────┴──────────────────────────────┘
                © 2026 · Made in Tirana
```

Single-column stack on mobile: hero copy → form → demo chips → 3 "for whom" rows → footer.

## Changes

1. **`src/routes/index.tsx`** — rebuilt as a 2-column editorial landing that contains the full auth form (sign in / sign up toggle, role chips, demo logins). Re-uses the existing `cream / ink / accent-red` tokens, serif headline, Unsplash hero card, and the 3 "For employees / employers / providers" rows now compacted under the hero.
2. **`src/routes/auth.tsx`** — deleted. Any redirect that previously sent users to `/auth` now sends them to `/`.
3. **`src/components/AppShell.tsx`** and any other reference to `to="/auth"` — updated to `to="/"`.
4. Already-signed-in visitors hitting `/` are redirected to their role landing (`/app`, `/employer`, `/provider`) via the same `getMyRoles` + `landingFor` check that was in `auth.tsx`.

## Technical notes

- Auth logic (signup_setup_account RPC, demo creds, error handling) is moved verbatim from `auth.tsx` — no behavior change, just a new shell.
- `routeTree.gen.ts` regenerates automatically when `auth.tsx` is removed.
- SEO `head()` keeps the existing landing meta (title, description, og tags); no per-route metadata is lost since `/auth` had only a title.
- Form validation, toasts, and post-signup navigation are unchanged.
