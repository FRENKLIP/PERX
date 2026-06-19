The user wants two visual changes based on the attached screenshot:

1. **Outer box surrounding the map widget — make it green**
   In `src/routes/_authenticated/app.tsx`, the `ProviderMapPanel` is wrapped in a `tile` container (`<div className="tile col-span-12 p-6 md:p-7">`). The `.tile` class gives it a cream (`#faf7f2`) background. We will change that wrapper to use `tile-sage` instead so the entire surrounding box is green.

2. **Mood selection bar — green background with black buttons**
   In `src/components/home/MoodPicker.tsx`, the mood picker is currently on a cream background with black active buttons and cream inactive buttons. We will change the bar container to `bg-sage` and update the button styles so the active buttons are black (`bg-ink text-cream`) and inactive buttons are green-tinted with black text (`bg-sage-soft text-ink border-ink/30` or similar), keeping the overall mood bar green.