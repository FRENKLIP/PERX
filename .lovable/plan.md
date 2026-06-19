## Plan: Black map widget container with black outline

**Goal:** Change the map widget's outer container to black with a black border.

**Changes:**

1. **`src/routes/_authenticated/app.tsx`** — Map panel wrapper
   - Change class from `tile-sage` to `tile-dark` (sets background to black)
   - Add `border border-ink` to give it a solid black outline

2. **`src/components/home/ProviderMapPanel.tsx`** — Inner section
   - Remove the `bg-sage` class from the `<section>` and the inner text/map divs so they inherit the dark background
   - Update text colors to `text-cream` for readability on black
   - Update the neighborhood filter buttons to a dark-theme variant (cream/black)

That’s it — the widget container becomes black with a black border, while keeping the map itself functional.