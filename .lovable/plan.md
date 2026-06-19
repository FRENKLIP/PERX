## Summary
Change the map background from light/green to black and the map pins (icons) to green.

## Plan

### 1. Dark map tiles
Switch the Leaflet tile layer in `src/components/TiranaMap.tsx` from Carto `light_all` to `dark_all` so the rendered map is black/dark.

### 2. Green pins
Update the `.perx-pin` rule in `src/styles.css`:
- Change `background` from `var(--color-ink)` (black) to `var(--color-sage)` (green)
- Keep emoji/icon text dark (`var(--color-ink)`) for contrast
- Keep or adjust the border for visibility on dark tiles

### 3. ProviderMapPanel dark theme
Update `src/components/home/ProviderMapPanel.tsx` to replace `bg-sage` with dark-background classes on:
- The outer `<section>`
- The left info panel (change text to light colors too)
- The map container div
Also update the neighborhood filter buttons to a dark-theme variant (dark bg with light text/borders).

These three changes together make the map area fully black with green pins.