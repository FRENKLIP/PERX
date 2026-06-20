
ALTER TABLE public.profiles DISABLE TRIGGER profiles_admin_update_guard;

WITH unassigned AS (
  SELECT p.id, ROW_NUMBER() OVER (ORDER BY p.created_at) AS rn
  FROM public.profiles p
  WHERE p.employer_company_id IS NULL
),
emps AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY name) AS en
  FROM public.companies WHERE kind='employer'
),
emp_count AS (SELECT count(*)::int AS n FROM emps)
UPDATE public.profiles p SET
  employer_company_id = (SELECT id FROM emps WHERE en = ((u.rn - 1) % (SELECT n FROM emp_count)) + 1),
  avatar_url = COALESCE(p.avatar_url, 'https://api.dicebear.com/7.x/personas/svg?seed=' || p.id::text),
  monthly_budget_all = 15000 + (random()*30000)::int,
  discount_points = (random()*250)::int
FROM unassigned u
WHERE p.id = u.id;

ALTER TABLE public.profiles ENABLE TRIGGER profiles_admin_update_guard;

INSERT INTO public.user_roles (user_id, role, company_id)
SELECT p.id, 'employee'::app_role, p.employer_company_id
FROM public.profiles p
WHERE p.employer_company_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = p.id);
