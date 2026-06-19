
ALTER TABLE public.cart_items
  ADD COLUMN IF NOT EXISTS chosen_provider_id uuid REFERENCES public.companies(id) ON DELETE SET NULL;
