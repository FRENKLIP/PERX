
CREATE TABLE public.offer_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
  provider_company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  share_pct integer NOT NULL DEFAULT 0 CHECK (share_pct >= 0 AND share_pct <= 100),
  is_owner boolean NOT NULL DEFAULT false,
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (offer_id, provider_company_id)
);

CREATE INDEX offer_providers_offer_idx ON public.offer_providers(offer_id);
CREATE INDEX offer_providers_company_idx ON public.offer_providers(provider_company_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.offer_providers TO authenticated;
GRANT SELECT ON public.offer_providers TO anon;
GRANT ALL ON public.offer_providers TO service_role;

ALTER TABLE public.offer_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Offer providers public read"
  ON public.offer_providers FOR SELECT
  USING (true);

CREATE POLICY "Owner inserts co-providers"
  ON public.offer_providers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.offers o
      WHERE o.id = offer_id
        AND public.has_company_role(auth.uid(), o.provider_company_id, 'provider_admin'::app_role)
    )
  );

CREATE POLICY "Owner or self updates"
  ON public.offer_providers FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.offers o
      WHERE o.id = offer_id
        AND public.has_company_role(auth.uid(), o.provider_company_id, 'provider_admin'::app_role)
    )
    OR public.has_company_role(auth.uid(), provider_company_id, 'provider_admin'::app_role)
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.offers o
      WHERE o.id = offer_id
        AND public.has_company_role(auth.uid(), o.provider_company_id, 'provider_admin'::app_role)
    )
    OR public.has_company_role(auth.uid(), provider_company_id, 'provider_admin'::app_role)
  );

CREATE POLICY "Owner deletes co-providers"
  ON public.offer_providers FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.offers o
      WHERE o.id = offer_id
        AND public.has_company_role(auth.uid(), o.provider_company_id, 'provider_admin'::app_role)
    )
    AND is_owner = false
  );

CREATE OR REPLACE FUNCTION public.check_offer_share_total()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_total integer;
  v_offer uuid;
BEGIN
  v_offer := COALESCE(NEW.offer_id, OLD.offer_id);
  SELECT COALESCE(SUM(share_pct), 0) INTO v_total
  FROM public.offer_providers
  WHERE offer_id = v_offer;
  IF v_total > 100 THEN
    RAISE EXCEPTION 'Total share for offer cannot exceed 100, got %', v_total;
  END IF;
  RETURN NEW;
END;
$$;

CREATE CONSTRAINT TRIGGER offer_providers_share_check
  AFTER INSERT OR UPDATE ON public.offer_providers
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.check_offer_share_total();

INSERT INTO public.offer_providers (offer_id, provider_company_id, share_pct, is_owner, accepted_at)
SELECT id, provider_company_id, 100, true, now()
FROM public.offers
ON CONFLICT DO NOTHING;

ALTER TABLE public.request_items
  ADD COLUMN IF NOT EXISTS share_pct_snapshot integer NOT NULL DEFAULT 100 CHECK (share_pct_snapshot >= 0 AND share_pct_snapshot <= 100);
