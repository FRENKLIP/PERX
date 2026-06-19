
CREATE POLICY "Public can view offer images"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'offer-images');

CREATE POLICY "Provider admins can upload offer images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'offer-images'
  AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'provider_admin')
);

CREATE POLICY "Provider admins can update offer images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'offer-images'
  AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'provider_admin')
);

CREATE POLICY "Provider admins can delete offer images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'offer-images'
  AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'provider_admin')
);
