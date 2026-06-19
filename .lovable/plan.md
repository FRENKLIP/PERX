## What's actually happening

Those toasts aren't decorations — they're real errors from the database:
**`infinite recursion detected in policy for relation "requests"`**.

The recursion was introduced last turn when I added a SELECT policy on `requests` that does `EXISTS (SELECT … FROM request_items …)`, while `request_items`'s own SELECT policy already does `EXISTS (SELECT … FROM requests …)`. Postgres re-enters RLS evaluation on each side and aborts. Every cart / requests / redeem query is currently failing.

So this plan does two things: **fix the recursion** (so the toasts stop happening), and **restyle the Toaster** (so when toasts *do* show, they live bottom-left in the PERX cream/ink/red palette).

## 1. Fix the RLS recursion

Migration:
- `DROP POLICY "Provider sees requests with their items" ON public.requests`.
- Add a `SECURITY DEFINER` helper `public.user_is_request_provider(_user uuid, _request uuid) RETURNS boolean` that does the `EXISTS … request_items … has_company_role …` lookup with RLS bypassed (same pattern as `has_role`).
- Recreate the policy using only that function — no direct subquery on `request_items` from a `requests` policy, so no recursion.

Result: providers can still load `/redeem/$id` for requests that include their items; the cart / requests pages stop erroring.

## 2. Move and theme the Toaster

Edit `src/routes/__root.tsx` (the one place `<Toaster>` is mounted):

- `position="bottom-left"` instead of `top-center`.
- Drop `richColors` (it forces sonner's default red/green palette).
- Pass `toastOptions` so toasts use the PERX palette:
  - background: `cream` (`#faf7f2`-ish, via CSS var `--cream`)
  - text: `ink`
  - border: hairline 1px `border-soft`
  - rounded-2xl, serif title, small caps label strip for the type (`Error` / `Done`)
  - Error variant: left accent bar in `accent-red`; success: `sage`.
- Keep the same `<Toaster>` API — no per-call changes needed at the 14 `toast(...)` sites.

## Files
- `supabase/migrations/<ts>_fix_requests_recursion.sql`
- `src/routes/__root.tsx` — Toaster props + className
- (optionally `src/components/ui/sonner.tsx` if we want the theming centralized there instead of on the root mount — I'll put it on the root mount to keep the change small)

## Out of scope
- No changes to the `mark_request_redeemed` function or to `request_items` policies.
- No new toast call sites; existing `toast.success/error(...)` calls just inherit the new look.
