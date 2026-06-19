CREATE POLICY "Public can read avatars"
ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated can upload avatars"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Authenticated can update avatars"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'avatars') WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Authenticated can delete avatars"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'avatars');