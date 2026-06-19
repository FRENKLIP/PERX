Make the ProviderMapPanel widget fully green with black text, leaving the map itself unchanged.

## What to change

**File: `src/components/home/ProviderMapPanel.tsx`**

1. **Green the whole widget background**
   - Change the outer `<section>` class from `bg-cream` to `bg-sage`
   - Remove the explicit `bg-sage` from the left panel div (now inherited from the section)

2. **Flip all text from cream (light) to ink (dark/black)**
   - Label "TIRANA, ON THE MAP": `text-cream/70` → `text-ink/70`
   - Heading "Find perks by neighborhood.": `text-cream` → `text-ink`
   - Description paragraph: `text-cream/70` → `text-ink/70`
   - Inactive filter buttons: `text-cream border-cream/30` → `text-ink border-ink/30`
   - Active filter button stays `bg-cream text-ink border-cream` (cream pill on green bg)
   - Pin count: `text-cream/70` → `text-ink/70`

3. **Leave the map untouched**
   - The right-column map div and `<TiranaMap />` component remain exactly as-is. The Leaflet tiles and paper background cover that area, so the green section background only shows on the left panel and any widget edges/corners.