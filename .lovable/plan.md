## Rebrand: Perka → PERX

### Scope
Replace every user-facing occurrence of "Perka" with "PERX" across the app. This is a pure branding change — no DB schema or route structure changes.

### Files to update

1. **Landing page** — `src/routes/index.tsx`
   - Meta title / description / og tags
   - Logo text: `Perka.` → `PERX.`
   - Body copy references

2. **Auth page** — `src/routes/auth.tsx`
   - Meta title
   - Logo text
   - Copy: "Sign in to your Perka wallet", "Choose how you'll use Perka"
   - Demo email domains: `@perka.demo` → `@perx.demo`

3. **Root layout** — `src/routes/__root.tsx`
   - Default meta title / description / og / twitter tags

4. **App shell** — `src/components/AppShell.tsx`
   - Logo text in nav

5. **i18n dictionary** — `src/lib/i18n.ts`
   - String keys and values: `ask_perka` → `ask_perx`, `Pyet Perkën` → `Pyet PERX`
   - localStorage key: `perka_locale` → `perx_locale`

6. **AI concierge** — `src/routes/api/chat.ts`
   - System prompt: "You are Perka" → "You are PERX"
   - Tool description: "Search the Perka marketplace" → "Search the PERX marketplace"

7. **Seed demo endpoint** — `src/routes/api/public/seed-demo.ts`
   - Any seeded demo data referencing the brand name

8. **Authenticated routes**
   - `src/routes/_authenticated/app.tsx`
   - `src/routes/_authenticated/marketplace.tsx`
   - `src/routes/_authenticated/concierge.tsx`
   - `src/routes/_authenticated/cart.tsx`
   - `src/routes/_authenticated/requests.tsx`
   - `src/routes/_authenticated/employer.tsx`
   - `src/routes/_authenticated/provider.tsx`
   - Update page titles, headings, and any hard-coded copy.

### Out of scope
- No DB migration or table renames.
- No URL or route changes.
- No new assets or logo images.

### Verification
Build check after edits to confirm no broken references.