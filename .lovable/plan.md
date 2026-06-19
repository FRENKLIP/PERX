Two changes:

1. **Active mood button → green**: In `src/components/home/MoodPicker.tsx`, change the active state from cream background to sage (green) background with black text: `bg-sage text-ink border-sage`.

2. **Map widget outer container → black**: In `src/routes/_authenticated/app.tsx`, change the map panel wrapper class from `tile-sage` to `tile-dark` so the outer container (the part visible around the inner green map panel) is black. The inner `ProviderMapPanel` keeps its green `bg-sage`.