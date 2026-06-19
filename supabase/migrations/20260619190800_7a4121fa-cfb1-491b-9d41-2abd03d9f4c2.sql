
-- Per-request redemption fields
ALTER TABLE public.requests
  ADD COLUMN IF NOT EXISTS redemption_code text UNIQUE,
  ADD COLUMN IF NOT EXISTS redeemed_at timestamptz,
  ADD COLUMN IF NOT EXISTS redeemed_by uuid;

-- Generator: PERX-XXXX-XXXX (alphanum, no confusing chars)
CREATE OR REPLACE FUNCTION public.gen_redemption_code()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
  i int;
  attempts int := 0;
BEGIN
  LOOP
    code := 'PERX-';
    FOR i IN 1..4 LOOP code := code || substr(alphabet, 1 + floor(random()*length(alphabet))::int, 1); END LOOP;
    code := code || '-';
    FOR i IN 1..4 LOOP code := code || substr(alphabet, 1 + floor(random()*length(alphabet))::int, 1); END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.requests WHERE redemption_code = code);
    attempts := attempts + 1;
    IF attempts > 8 THEN RAISE EXCEPTION 'Could not generate unique redemption code'; END IF;
  END LOOP;
  RETURN code;
END;
$$;

-- Trigger: fill code when status becomes approved
CREATE OR REPLACE FUNCTION public.fill_redemption_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'approved' AND NEW.redemption_code IS NULL THEN
    NEW.redemption_code := public.gen_redemption_code();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fill_redemption_code ON public.requests;
CREATE TRIGGER trg_fill_redemption_code
  BEFORE INSERT OR UPDATE OF status ON public.requests
  FOR EACH ROW EXECUTE FUNCTION public.fill_redemption_code();

-- Backfill existing approved rows
UPDATE public.requests SET redemption_code = public.gen_redemption_code()
WHERE status = 'approved' AND redemption_code IS NULL;

-- Mark-redeemed RPC (employee or provider admin of any line item)
CREATE OR REPLACE FUNCTION public.mark_request_redeemed(p_request_id uuid)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_employee uuid;
  v_status text;
  v_redeemed timestamptz;
  v_allowed boolean;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT employee_id, status::text, redeemed_at
    INTO v_employee, v_status, v_redeemed
    FROM public.requests WHERE id = p_request_id FOR UPDATE;

  IF v_employee IS NULL THEN RAISE EXCEPTION 'Request not found'; END IF;
  IF v_status <> 'approved' THEN RAISE EXCEPTION 'Request is not approved'; END IF;
  IF v_redeemed IS NOT NULL THEN RETURN v_redeemed; END IF;

  v_allowed := (v_user = v_employee) OR EXISTS (
    SELECT 1 FROM public.request_items ri
    WHERE ri.request_id = p_request_id
      AND public.has_company_role(v_user, ri.provider_company_id, 'provider_admin'::app_role)
  );
  IF NOT v_allowed THEN RAISE EXCEPTION 'Not authorized'; END IF;

  UPDATE public.requests SET redeemed_at = now(), redeemed_by = v_user
    WHERE id = p_request_id RETURNING redeemed_at INTO v_redeemed;
  RETURN v_redeemed;
END;
$$;

-- Allow provider admins of any line item to read the parent request (for the redemption screen)
DROP POLICY IF EXISTS "Provider sees requests with their items" ON public.requests;
CREATE POLICY "Provider sees requests with their items"
ON public.requests
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.request_items ri
    WHERE ri.request_id = requests.id
      AND public.has_company_role(auth.uid(), ri.provider_company_id, 'provider_admin'::app_role)
  )
);
