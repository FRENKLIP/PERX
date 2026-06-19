
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS policy_max_request_all int,
  ADD COLUMN IF NOT EXISTS policy_allowed_categories text[],
  ADD COLUMN IF NOT EXISTS policy_auto_approve_below_all int,
  ADD COLUMN IF NOT EXISTS policy_default_monthly_budget_all int NOT NULL DEFAULT 25000;

CREATE POLICY "Employer admins update own company"
  ON public.companies FOR UPDATE
  TO authenticated
  USING (public.has_company_role(auth.uid(), id, 'employer_admin'::app_role))
  WITH CHECK (public.has_company_role(auth.uid(), id, 'employer_admin'::app_role));
