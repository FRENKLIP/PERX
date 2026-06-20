
-- ============================================================
-- 1. AVATAR STORAGE: enforce path ownership
-- ============================================================
DROP POLICY IF EXISTS "Authenticated can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can update avatars" ON storage.objects;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Users upload own avatar'
  ) THEN
    CREATE POLICY "Users upload own avatar" ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
END $$;

-- ============================================================
-- 2. COMPANIES: hide sensitive columns from public reads
-- ============================================================
REVOKE SELECT ON public.companies FROM anon, authenticated;
GRANT SELECT (
  id, name, kind, country, currency, logo_url, hero_image_url, description,
  city, neighborhood, address, lat, lng, created_at
) ON public.companies TO anon, authenticated;
GRANT SELECT ON public.companies TO service_role;

-- Helpers for employer admins to read sensitive columns
CREATE OR REPLACE FUNCTION public.get_company_billing(p_company_id uuid)
RETURNS TABLE(plan text, plan_period text, plan_renews_at timestamptz, plan_seats integer, discount_points integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_company_role(auth.uid(), p_company_id, 'employer_admin'::app_role) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN QUERY
    SELECT c.plan, c.plan_period, c.plan_renews_at, c.plan_seats, c.discount_points
      FROM public.companies c WHERE c.id = p_company_id;
END $$;

CREATE OR REPLACE FUNCTION public.get_company_policy(p_company_id uuid)
RETURNS TABLE(
  id uuid, name text,
  policy_max_request_all integer,
  policy_allowed_categories text[],
  policy_auto_approve_below_all integer,
  policy_default_monthly_budget_all integer
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_company_role(auth.uid(), p_company_id, 'employer_admin'::app_role) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN QUERY
    SELECT c.id, c.name, c.policy_max_request_all, c.policy_allowed_categories,
           c.policy_auto_approve_below_all, c.policy_default_monthly_budget_all
      FROM public.companies c WHERE c.id = p_company_id;
END $$;

GRANT EXECUTE ON FUNCTION public.get_company_billing(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_company_policy(uuid) TO authenticated;

-- ============================================================
-- 3. OFFER_PROVIDERS: only allow safe column updates
-- ============================================================
REVOKE UPDATE ON public.offer_providers FROM authenticated;
GRANT UPDATE (accepted_at) ON public.offer_providers TO authenticated;
GRANT ALL ON public.offer_providers TO service_role;

-- ============================================================
-- 4. PROFILES: guard sensitive field changes by non-self users
-- ============================================================
CREATE OR REPLACE FUNCTION public.profiles_admin_update_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF auth.uid() IS DISTINCT FROM NEW.id THEN
    IF NEW.discount_points IS DISTINCT FROM OLD.discount_points THEN
      RAISE EXCEPTION 'Only the profile owner can change discount_points';
    END IF;
    IF NEW.employer_company_id IS NULL AND OLD.employer_company_id IS NOT NULL THEN
      RAISE EXCEPTION 'Cannot detach employee from a company';
    END IF;
    IF NEW.employer_company_id IS DISTINCT FROM OLD.employer_company_id
       AND NEW.employer_company_id IS NOT NULL
       AND NOT public.has_company_role(auth.uid(), NEW.employer_company_id, 'employer_admin'::app_role) THEN
      RAISE EXCEPTION 'Cannot reassign profile to a company you do not administer';
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS profiles_admin_update_guard ON public.profiles;
CREATE TRIGGER profiles_admin_update_guard
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_admin_update_guard();
