CREATE OR REPLACE FUNCTION public.same_employer_as_current_user(_profile_employer_company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _profile_employer_company_id IS NOT NULL
    AND _profile_employer_company_id = (
      SELECT p.employer_company_id
      FROM public.profiles p
      WHERE p.id = auth.uid()
    )
$$;

REVOKE ALL ON FUNCTION public.same_employer_as_current_user(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.same_employer_as_current_user(uuid) TO authenticated;

DROP POLICY IF EXISTS "Teammates can read directory" ON public.profiles;

CREATE POLICY "Teammates can read directory"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.same_employer_as_current_user(employer_company_id));