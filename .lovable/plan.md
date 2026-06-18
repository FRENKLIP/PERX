## Problem

Right now every signed-in user — employee, employer, or provider — sees the full nav (Home, Marketplace, Concierge, Cart, Requests) and can open any page. Employer and provider tabs are conditionally rendered, but the employee-only pages are not gated. A provider or employer can still browse `/marketplace`, add to cart, and submit requests.

## Goal

Each role gets its own surface:

- **Employee** → `/app`, `/marketplace`, `/concierge`, `/cart`, `/requests`
- **Employer admin** → `/employer` only
- **Provider admin** → `/provider` only

Users with multiple roles (e.g. an employer who also has an employee seat) see the union of their allowed tabs.

## Changes

### 1. Centralize role detection
Add a small `useRoles()` helper (or inline in `AppShell`) that returns `{ isEmployee, isEmployer, isProvider }`. A user is treated as an employee when they have no role row OR an explicit `employee` role (current behavior — employees today have no `user_roles` entry, just a wallet/profile).

### 2. Gate the nav in `AppShell`
- Employee tabs (Home, Marketplace, Concierge, Cart, Requests) render only when `isEmployee`.
- Employer tab renders only when `isEmployer`.
- Provider tab renders only when `isProvider`.
- Wallet budget pill renders only for employees (employers/providers have no personal wallet).
- Brand logo links to the user's primary landing route (`/employer` for employer, `/provider` for provider, otherwise `/app`).

### 3. Gate the routes
In each `_authenticated/*.tsx`, add a `beforeLoad` that:
- reads `user_roles` for the current user,
- if the role is not allowed for that page, `throw redirect({ to: <their landing> })`.

Mapping:
- `app.tsx`, `marketplace.tsx`, `concierge.tsx`, `cart.tsx`, `requests.tsx` → employees only
- `employer.tsx` → employer_admin only
- `provider.tsx` → provider_admin only

### 4. Post-login landing
Update `/auth` success redirect (and the `_authenticated` root if needed) to route to:
- `/employer` if employer_admin,
- `/provider` if provider_admin,
- `/app` otherwise.

### 5. Build error
The pasted rolldown stack trace is the transient build failure we already reproduced — a clean rerun of `build:dev` succeeded. No code change for that; the next build after these edits will reverify.

## Out of scope

- No DB/schema changes. Roles already live in `user_roles` with `has_role()`.
- No new pages — just visibility + redirects.
- Multi-role UX stays simple: each allowed tab shows; no role switcher.
