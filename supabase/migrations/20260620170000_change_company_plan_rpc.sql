CREATE OR REPLACE FUNCTION public.change_company_plan(
  p_company_id uuid,
  p_plan text,
  p_period text,
  p_apply_points integer DEFAULT 0
)
RETURNS TABLE(ok boolean, amount integer, applied integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_base integer;
  v_seats integer;
  v_available integer;
  v_apply integer;
  v_renews_at timestamptz;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.has_company_role(v_user, p_company_id, 'employer_admin'::app_role) THEN
    RAISE EXCEPTION 'Not authorized for this company';
  END IF;

  IF p_plan NOT IN ('starter', 'growth', 'enterprise') THEN
    RAISE EXCEPTION 'Invalid plan';
  END IF;

  IF p_period NOT IN ('monthly', 'yearly') THEN
    RAISE EXCEPTION 'Invalid billing period';
  END IF;

  v_base := CASE p_plan
    WHEN 'starter' THEN 0
    WHEN 'growth' THEN CASE p_period WHEN 'monthly' THEN 49900 ELSE 499000 END
    WHEN 'enterprise' THEN CASE p_period WHEN 'monthly' THEN 199000 ELSE 1990000 END
  END;

  v_seats := CASE p_plan
    WHEN 'starter' THEN 10
    WHEN 'growth' THEN 50
    WHEN 'enterprise' THEN 9999
  END;

  SELECT c.discount_points
    INTO v_available
    FROM public.companies c
    WHERE c.id = p_company_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Company not found';
  END IF;

  v_apply := LEAST(
    GREATEST(COALESCE(p_apply_points, 0), 0),
    COALESCE(v_available, 0),
    FLOOR(v_base * 0.5)::integer
  );

  v_renews_at := now();
  IF p_period = 'monthly' THEN
    v_renews_at := v_renews_at + interval '1 month';
  ELSE
    v_renews_at := v_renews_at + interval '1 year';
  END IF;

  UPDATE public.companies
    SET plan = p_plan,
        plan_period = p_period,
        plan_renews_at = v_renews_at,
        plan_seats = v_seats,
        discount_points = COALESCE(v_available, 0) - v_apply
    WHERE id = p_company_id;

  IF v_base > 0 THEN
    INSERT INTO public.company_invoices (
      company_id,
      plan,
      plan_period,
      amount_all,
      discount_points_applied,
      status,
      period_start,
      period_end
    ) VALUES (
      p_company_id,
      p_plan,
      p_period,
      GREATEST(v_base - v_apply, 0),
      v_apply,
      'paid',
      now(),
      v_renews_at
    );
  END IF;

  RETURN QUERY SELECT true, GREATEST(v_base - v_apply, 0), v_apply;
END;
$$;

REVOKE ALL ON FUNCTION public.change_company_plan(uuid, text, text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.change_company_plan(uuid, text, text, integer) TO authenticated;
