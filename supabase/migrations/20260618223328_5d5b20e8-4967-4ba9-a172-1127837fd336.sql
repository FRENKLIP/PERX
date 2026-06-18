
-- 1. Fix profiles exposure: restrict SELECT to self + employer admins of same company
DROP POLICY IF EXISTS "Profiles viewable by authenticated" ON public.profiles;
CREATE POLICY "Profiles viewable by self or employer admin"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    auth.uid() = id
    OR (
      employer_company_id IS NOT NULL
      AND public.has_company_role(auth.uid(), employer_company_id, 'employer_admin'::app_role)
    )
  );

-- 2. Remove open self-insert role policy (privilege escalation)
DROP POLICY IF EXISTS "Users create own roles" ON public.user_roles;

-- 3. Remove open company creation policy
DROP POLICY IF EXISTS "Authenticated can create companies" ON public.companies;

-- 4. SECURITY DEFINER signup helper: one role per user, controlled company creation
CREATE OR REPLACE FUNCTION public.signup_setup_account(
  p_role app_role,
  p_company_name text DEFAULT NULL,
  p_full_name text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_company_id uuid;
  v_default_employer constant uuid := '11111111-1111-1111-1111-111111111111';
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_role NOT IN ('employee','employer_admin','provider_admin') THEN
    RAISE EXCEPTION 'Invalid role';
  END IF;

  -- Allow only initial setup: reject if user already has any role
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_user) THEN
    RAISE EXCEPTION 'Account already initialized';
  END IF;

  IF p_role = 'employee' THEN
    v_company_id := v_default_employer;
    UPDATE public.profiles
      SET employer_company_id = v_company_id,
          full_name = COALESCE(p_full_name, full_name)
      WHERE id = v_user;
  ELSIF p_role = 'employer_admin' THEN
    INSERT INTO public.companies (name, kind, country, currency, city)
      VALUES (COALESCE(NULLIF(trim(p_company_name),''), 'New employer'), 'employer', 'AL', 'ALL', 'Tirana')
      RETURNING id INTO v_company_id;
  ELSE -- provider_admin
    INSERT INTO public.companies (name, kind, country, currency, city)
      VALUES (COALESCE(NULLIF(trim(p_company_name),''), 'New provider'), 'provider', 'AL', 'ALL', 'Tirana')
      RETURNING id INTO v_company_id;
  END IF;

  INSERT INTO public.user_roles (user_id, role, company_id)
    VALUES (v_user, p_role, v_company_id);

  RETURN v_company_id;
END;
$$;

-- 5. Lock down EXECUTE: only signed-in users may call the signup helper; revoke
-- public/anon access on internal SECURITY DEFINER helpers.
REVOKE ALL ON FUNCTION public.signup_setup_account(app_role, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.signup_setup_account(app_role, text, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.has_company_role(uuid, uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_company_role(uuid, uuid, app_role) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
