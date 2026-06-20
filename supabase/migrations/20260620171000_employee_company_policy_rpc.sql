CREATE OR REPLACE FUNCTION public.get_employee_company_policy(p_company_id uuid)
RETURNS TABLE(
  policy_max_request_all integer,
  policy_allowed_categories text[],
  policy_auto_approve_below_all integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.employer_company_id = p_company_id
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
    SELECT c.policy_max_request_all,
           c.policy_allowed_categories,
           c.policy_auto_approve_below_all
      FROM public.companies c
      WHERE c.id = p_company_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_employee_company_policy(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_employee_company_policy(uuid) TO authenticated;
