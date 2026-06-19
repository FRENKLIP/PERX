Change the left panel of the map widget to a green (sage) background with matching text and button styles.

1. In `src/components/home/ProviderMapPanel.tsx`:
   - Change the left panel container from `bg-cream` to `bg-sage text-cream`
   - Update the label text color from `text-ink-soft` to `text-cream/70`
   - Update the heading color to `text-cream`
   - Update the paragraph color to `text-cream/70`
   - Update the filter buttons:
     - Active state: `bg-cream text-ink border-cream`
     - Inactive state: `bg-sage-soft/30 text-cream border-cream/30 hover:border-cream/60`
   - Update the pin count text color to `text-cream/70`