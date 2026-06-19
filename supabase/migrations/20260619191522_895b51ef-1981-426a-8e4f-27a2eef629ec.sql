
DROP POLICY IF EXISTS "Provider sees requests with their items" ON public.requests;

CREATE OR REPLACE FUNCTION public.user_is_request_provider(_user uuid, _request uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.request_items ri
    WHERE ri.request_id = _request
      AND public.has_company_role(_user, ri.provider_company_id, 'provider_admin'::app_role)
  )
$$;

CREATE POLICY "Provider sees requests with their items"
ON public.requests
FOR SELECT
TO authenticated
USING (public.user_is_request_provider(auth.uid(), id));
