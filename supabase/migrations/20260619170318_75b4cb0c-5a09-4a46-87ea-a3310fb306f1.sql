CREATE POLICY "Employer admins update employee profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  employer_company_id IS NOT NULL
  AND public.has_company_role(auth.uid(), employer_company_id, 'employer_admin'::app_role)
)
WITH CHECK (
  employer_company_id IS NULL
  OR public.has_company_role(auth.uid(), employer_company_id, 'employer_admin'::app_role)
);