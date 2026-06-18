
CREATE TABLE public.favorites (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  offer_id uuid NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, offer_id)
);
GRANT SELECT, INSERT, DELETE ON public.favorites TO authenticated;
GRANT ALL ON public.favorites TO service_role;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read favorites" ON public.favorites FOR SELECT TO authenticated USING (true);
CREATE POLICY "Insert own favorite" ON public.favorites FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Delete own favorite" ON public.favorites FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.offer_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (offer_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.offer_reviews TO authenticated;
GRANT ALL ON public.offer_reviews TO service_role;
ALTER TABLE public.offer_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read reviews" ON public.offer_reviews FOR SELECT TO authenticated USING (true);
CREATE POLICY "Insert own review" ON public.offer_reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Update own review" ON public.offer_reviews FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Delete own review" ON public.offer_reviews FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX favorites_offer_idx ON public.favorites(offer_id);
CREATE INDEX offer_reviews_offer_idx ON public.offer_reviews(offer_id);
