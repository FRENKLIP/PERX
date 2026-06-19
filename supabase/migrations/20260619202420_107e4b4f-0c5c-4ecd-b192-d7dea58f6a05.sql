
CREATE TABLE public.saved_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  emoji text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_collections TO authenticated;
GRANT ALL ON public.saved_collections TO service_role;

ALTER TABLE public.saved_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own collections"
  ON public.saved_collections FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_saved_collections_user ON public.saved_collections(user_id, sort_order);

ALTER TABLE public.favorites
  ADD COLUMN collection_id uuid REFERENCES public.saved_collections(id) ON DELETE SET NULL;

CREATE INDEX idx_favorites_collection ON public.favorites(collection_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_saved_collections_updated_at
  BEFORE UPDATE ON public.saved_collections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
