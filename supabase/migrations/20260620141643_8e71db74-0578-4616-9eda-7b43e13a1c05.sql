
-- 1. Favorites: own-only SELECT
DROP POLICY IF EXISTS "Read favorites" ON public.favorites;
CREATE POLICY "Read own favorites" ON public.favorites
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- 2. Avatars bucket: path-scoped UPDATE/DELETE (path = {user_id}/...)
DROP POLICY IF EXISTS "Authenticated users can update avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users update own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users delete own avatar" ON storage.objects;

CREATE POLICY "Users update own avatar"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users delete own avatar"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 3. offer-images bucket: scope UPDATE/DELETE to the provider's own company (path = {company_id}/...)
DROP POLICY IF EXISTS "Provider admins can update offer images" ON storage.objects;
DROP POLICY IF EXISTS "Provider admins can delete offer images" ON storage.objects;
DROP POLICY IF EXISTS "Provider admins update own offer images" ON storage.objects;
DROP POLICY IF EXISTS "Provider admins delete own offer images" ON storage.objects;

CREATE POLICY "Provider admins update own offer images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'offer-images'
    AND public.has_company_role(auth.uid(), ((storage.foldername(name))[1])::uuid, 'provider_admin'::app_role)
  )
  WITH CHECK (
    bucket_id = 'offer-images'
    AND public.has_company_role(auth.uid(), ((storage.foldername(name))[1])::uuid, 'provider_admin'::app_role)
  );

CREATE POLICY "Provider admins delete own offer images"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'offer-images'
    AND public.has_company_role(auth.uid(), ((storage.foldername(name))[1])::uuid, 'provider_admin'::app_role)
  );

-- 4. Companies: hide internal policy/budget columns from anonymous users.
-- Keep public read for the marketing-facing columns; restrict policy columns to authenticated.
REVOKE SELECT ON public.companies FROM anon;
GRANT SELECT (
  id, kind, name, description, logo_url, hero_image_url,
  city, neighborhood, address, lat, lng,
  country, currency, created_at
) ON public.companies TO anon;
-- authenticated keeps full SELECT (RLS still applies); employer admins read policy cols for their company.
GRANT SELECT ON public.companies TO authenticated;
