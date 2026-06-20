## Changes

### 1. Landing page — revert editorial section
In `src/routes/index.tsx`, the "Editor's note" parallax section (~lines 157-170) currently uses the new Tirana photo. Revert just that `<img>` back to the original Unsplash hotel image URL. Keep the Tirana photo on the hero section only.

### 2. Workers page — Quests tab
Currently `QuestsPanel` renders at the bottom of `/app`. Move it to a dedicated route:

- Create `src/routes/_authenticated/quests.tsx` — requires `employee` role, renders `<QuestsPanel userId={...} />` inside the standard page wrapper with a page title.
- Remove the `<QuestsPanel />` mount from `src/routes/_authenticated/app.tsx` (and the now-unused `userId` state).
- Add a "Quests" nav link to the employee tabs in `src/components/AppShell.tsx` (alongside Home / Marketplace / Saved / Requests / Cart), with a `Sparkles` or `Coins` icon.

No DB or server-function changes. The points balance chip stays inside `QuestsPanel`, so it moves with the panel to the new tab.
