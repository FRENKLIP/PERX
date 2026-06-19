## Plan: White background + green text for map widget and mood picker

### Changes

1. **Mood picker container** (`src/routes/_authenticated/app.tsx` line 127)
   - Change `tile-dark` → `tile` (cream/white background)

2. **Mood picker buttons** (`src/components/home/MoodPicker.tsx` lines 32-36)
   - Inactive: green text + green border on transparent background (`text-sage border-sage/40`)
   - Active: keep green background, switch text to cream (`bg-sage text-cream border-sage`)
   - Hover: fill green, cream text

3. **Map widget outer container** (`src/routes/_authenticated/app.tsx` line 133)
   - Change `tile-dark` → `tile` (cream/white background)

4. **Map widget inner panel** (`src/components/home/ProviderMapPanel.tsx`)
   - Section background: `bg-sage` → `bg-cream`
   - Left column background: `bg-sage` → `bg-cream`
   - All text: `text-ink` → `text-sage`
   - Neighborhood filter buttons: inactive = transparent + green border + green text; active = green bg + cream text
   - Pin count text: `text-ink` → `text-sage`

5. **Styles** (`src/styles.css`)
   - Add `.tile-white` class with pure white background, keeping the same border radius and shadow as `.tile`
   - Update `.tile` usages to `.tile-white` for these two widgets if the user wants pure white instead of cream

### Open question
The existing `.tile` class uses cream (`#faf7f2`). Should the widgets use cream or pure white (`#ffffff`)?