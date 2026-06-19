## Goal
Update the `ProviderMapPanel` widget styling to make text bolder, filter-button selections black-on-green, and ensure the entire widget box is green.

## Changes

### 1. Bolder text
- Heading: add `font-bold`
- Description: bump to `font-medium`
- Label: add `font-bold` (already uppercase tracking)

### 2. Black selection buttons
- Active filter button: change from `bg-cream text-ink` to `bg-ink text-cream` (black background, light text)
- Inactive filter button: keep transparent background with `text-ink border-ink/30`

### 3. Whole widget box green
- The map column (`md:col-span-8`) currently inherits the page background at its edges/behind the map. Add `bg-sage` to that container so the entire widget box is green, with the Leaflet map still rendering on top.
- Verify the section’s `overflow-hidden` and rounded corners remain intact.

## File
- `src/components/home/ProviderMapPanel.tsx`