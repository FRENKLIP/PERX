-- 1. companies columns
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS discount_points integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'starter',
  ADD COLUMN IF NOT EXISTS plan_period text NOT NULL DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS plan_renews_at timestamptz,
  ADD COLUMN IF NOT EXISTS plan_seats integer;

ALTER TABLE public.companies
  DROP CONSTRAINT IF EXISTS companies_plan_check;
ALTER TABLE public.companies
  ADD CONSTRAINT companies_plan_check CHECK (plan IN ('starter','growth','enterprise'));
ALTER TABLE public.companies
  DROP CONSTRAINT IF EXISTS companies_plan_period_check;
ALTER TABLE public.companies
  ADD CONSTRAINT companies_plan_period_check CHECK (plan_period IN ('monthly','yearly'));

-- 2. quest_definitions
CREATE TABLE IF NOT EXISTS public.quest_definitions (
  slug text PRIMARY KEY,
  title text NOT NULL,
  description text NOT NULL,
  points integer NOT NULL DEFAULT 0,
  target integer NOT NULL DEFAULT 1,
  metric text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.quest_definitions TO authenticated;
GRANT ALL ON public.quest_definitions TO service_role;
ALTER TABLE public.quest_definitions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone signed in can read quests" ON public.quest_definitions;
CREATE POLICY "Anyone signed in can read quests"
  ON public.quest_definitions FOR SELECT TO authenticated USING (true);

INSERT INTO public.quest_definitions (slug, title, description, points, target, metric, sort_order) VALUES
  ('onboard_employees','Build your team','Invite and onboard your first 5 employees.',200,5,'employees_onboarded',1),
  ('approve_requests','First approvals','Approve 10 benefit requests from employees.',300,10,'requests_approved',2),
  ('configure_policy','Set the rules','Configure at least one policy rule (cap, allowed categories, or auto-approve).',150,1,'policy_configured',3),
  ('grow_team','Team of fifteen','Reach 15 active employees on PERX.',500,15,'employees_onboarded',4),
  ('approve_fifty','Approval pro','Approve 50 requests this quarter.',800,50,'requests_approved',5)
ON CONFLICT (slug) DO NOTHING;

-- 3. company_quests
CREATE TABLE IF NOT EXISTS public.company_quests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  quest_slug text NOT NULL REFERENCES public.quest_definitions(slug) ON DELETE CASCADE,
  progress integer NOT NULL DEFAULT 0,
  completed_at timestamptz,
  claimed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, quest_slug)
);
GRANT SELECT, INSERT, UPDATE ON public.company_quests TO authenticated;
GRANT ALL ON public.company_quests TO service_role;
ALTER TABLE public.company_quests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Employer admins read their quests" ON public.company_quests;
CREATE POLICY "Employer admins read their quests"
  ON public.company_quests FOR SELECT TO authenticated
  USING (public.has_company_role(auth.uid(), company_id, 'employer_admin'));
DROP POLICY IF EXISTS "Employer admins upsert their quests" ON public.company_quests;
CREATE POLICY "Employer admins upsert their quests"
  ON public.company_quests FOR INSERT TO authenticated
  WITH CHECK (public.has_company_role(auth.uid(), company_id, 'employer_admin'));
DROP POLICY IF EXISTS "Employer admins update their quests" ON public.company_quests;
CREATE POLICY "Employer admins update their quests"
  ON public.company_quests FOR UPDATE TO authenticated
  USING (public.has_company_role(auth.uid(), company_id, 'employer_admin'))
  WITH CHECK (public.has_company_role(auth.uid(), company_id, 'employer_admin'));

DROP TRIGGER IF EXISTS company_quests_updated_at ON public.company_quests;
CREATE TRIGGER company_quests_updated_at
  BEFORE UPDATE ON public.company_quests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. company_invoices
CREATE TABLE IF NOT EXISTS public.company_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  plan text NOT NULL,
  plan_period text NOT NULL,
  amount_all integer NOT NULL,
  discount_points_applied integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'paid',
  period_start timestamptz NOT NULL DEFAULT now(),
  period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.company_invoices TO authenticated;
GRANT ALL ON public.company_invoices TO service_role;
ALTER TABLE public.company_invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Employer admins read invoices" ON public.company_invoices;
CREATE POLICY "Employer admins read invoices"
  ON public.company_invoices FOR SELECT TO authenticated
  USING (public.has_company_role(auth.uid(), company_id, 'employer_admin'));
DROP POLICY IF EXISTS "Employer admins insert invoices" ON public.company_invoices;
CREATE POLICY "Employer admins insert invoices"
  ON public.company_invoices FOR INSERT TO authenticated
  WITH CHECK (public.has_company_role(auth.uid(), company_id, 'employer_admin'));