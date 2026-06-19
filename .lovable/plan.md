Change the mood selection bar background from green to black, and ensure the inactive buttons remain visible on the dark background. The map widget already has a green background; no changes needed there.

Files to modify:
- `src/routes/_authenticated/app.tsx`: change the mood strip container class from `tile-sage` to `tile-dark` (or equivalent black background).
- `src/components/home/MoodPicker.tsx`: update inactive button text color from `text-ink` to `text-cream` so it is readable on the black background.