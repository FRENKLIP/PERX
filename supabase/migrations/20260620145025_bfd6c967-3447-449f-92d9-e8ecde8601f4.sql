
-- 1. profiles: add discount_points
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS discount_points integer NOT NULL DEFAULT 0;

-- 2. requests: add points redemption columns
ALTER TABLE public.requests
  ADD COLUMN IF NOT EXISTS points_redeemed integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_all integer NOT NULL DEFAULT 0;

-- 3. employee_quest_definitions
CREATE TABLE IF NOT EXISTS public.employee_quest_definitions (
  slug text PRIMARY KEY,
  title text NOT NULL,
  description text NOT NULL,
  points integer NOT NULL,
  target integer NOT NULL DEFAULT 1,
  metric text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.employee_quest_definitions TO authenticated;
GRANT ALL ON public.employee_quest_definitions TO service_role;
ALTER TABLE public.employee_quest_definitions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone signed in can read employee quests" ON public.employee_quest_definitions;
CREATE POLICY "Anyone signed in can read employee quests"
  ON public.employee_quest_definitions FOR SELECT TO authenticated USING (true);

INSERT INTO public.employee_quest_definitions (slug, title, description, points, target, metric, sort_order) VALUES
  ('complete_profile','Set up your profile','Add your name and a profile photo.',100,1,'profile_complete',1),
  ('first_request','First taste','Get your first benefit request approved.',150,1,'requests_approved',2),
  ('redeem_first','Redeem in person','Redeem your first approved benefit at the provider.',200,1,'redeemed_count',3),
  ('save_five_favorites','Curator','Save 5 offers to your favorites.',100,5,'favorites_count',4),
  ('write_review','Share the love','Write your first offer review.',150,1,'reviews_count',5),
  ('redeem_ten','Regular','Get 10 approved benefit requests.',500,10,'requests_approved',6)
ON CONFLICT (slug) DO NOTHING;

-- 4. employee_quests
CREATE TABLE IF NOT EXISTS public.employee_quests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quest_slug text NOT NULL REFERENCES public.employee_quest_definitions(slug) ON DELETE CASCADE,
  progress integer NOT NULL DEFAULT 0,
  completed_at timestamptz,
  claimed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, quest_slug)
);
GRANT SELECT, INSERT, UPDATE ON public.employee_quests TO authenticated;
GRANT ALL ON public.employee_quests TO service_role;
ALTER TABLE public.employee_quests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own quests" ON public.employee_quests;
CREATE POLICY "Users read own quests"
  ON public.employee_quests FOR SELECT TO authenticated
  USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Users insert own quests" ON public.employee_quests;
CREATE POLICY "Users insert own quests"
  ON public.employee_quests FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Users update own quests" ON public.employee_quests;
CREATE POLICY "Users update own quests"
  ON public.employee_quests FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP TRIGGER IF EXISTS employee_quests_updated_at ON public.employee_quests;
CREATE TRIGGER employee_quests_updated_at
  BEFORE UPDATE ON public.employee_quests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. points_ledger
CREATE TABLE IF NOT EXISTS public.points_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  delta integer NOT NULL,
  reason text NOT NULL,
  ref_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.points_ledger TO authenticated;
GRANT ALL ON public.points_ledger TO service_role;
ALTER TABLE public.points_ledger ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own ledger" ON public.points_ledger;
CREATE POLICY "Users read own ledger"
  ON public.points_ledger FOR SELECT TO authenticated
  USING (user_id = auth.uid());
