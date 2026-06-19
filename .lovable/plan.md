Restructure the hero section of `src/routes/index.tsx`:

1. Remove the `Hero3D` import and the right column (`<Hero3D />`).
2. Replace the two-column grid with a centered single-column layout: full viewport-tall section (`min-h-screen`), content centered both horizontally and vertically, headline/sub/CTAs aligned center, `max-w-5xl` container.
3. Add a background photo (Tirana / Blloku editorial Unsplash shot) as `<img>` absolutely positioned `inset-0`, `object-cover`, `opacity-15`, behind content. Add a subtle cream gradient overlay so text stays readable.
4. Keep nav, all downstream sections, and rest of page unchanged.