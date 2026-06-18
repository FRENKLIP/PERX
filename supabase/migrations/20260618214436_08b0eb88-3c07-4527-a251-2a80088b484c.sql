
-- ENUMS
CREATE TYPE public.app_role AS ENUM ('employee', 'employer_admin', 'provider_admin');
CREATE TYPE public.company_kind AS ENUM ('employer', 'provider', 'both');
CREATE TYPE public.request_status AS ENUM ('pending', 'approved', 'rejected');

-- COMPANIES
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  kind public.company_kind NOT NULL,
  country TEXT NOT NULL DEFAULT 'AL',
  currency TEXT NOT NULL DEFAULT 'ALL',
  logo_url TEXT,
  hero_image_url TEXT,
  description TEXT,
  city TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.companies TO anon, authenticated;
GRANT INSERT, UPDATE ON public.companies TO authenticated;
GRANT ALL ON public.companies TO service_role;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Companies are public" ON public.companies FOR SELECT USING (true);
CREATE POLICY "Authenticated can create companies" ON public.companies FOR INSERT TO authenticated WITH CHECK (true);

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  locale TEXT NOT NULL DEFAULT 'en',
  employer_company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  monthly_budget_all INTEGER NOT NULL DEFAULT 25000,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles viewable by authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- USER ROLES (company-scoped)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role, company_id)
);
GRANT SELECT, INSERT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users create own roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- has_role definer
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.has_company_role(_user_id uuid, _company_id uuid, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role AND company_id = _company_id)
$$;

-- CATEGORIES
CREATE TABLE public.categories (
  slug TEXT PRIMARY KEY,
  name_en TEXT NOT NULL,
  name_sq TEXT NOT NULL,
  icon TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Categories public" ON public.categories FOR SELECT USING (true);

-- OFFERS
CREATE TABLE public.offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  category_slug TEXT NOT NULL REFERENCES public.categories(slug),
  title TEXT NOT NULL,
  title_sq TEXT,
  description TEXT NOT NULL,
  description_sq TEXT,
  price_all INTEGER NOT NULL,
  image_url TEXT,
  location TEXT,
  is_seasonal BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.offers TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.offers TO authenticated;
GRANT ALL ON public.offers TO service_role;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Offers public" ON public.offers FOR SELECT USING (true);
CREATE POLICY "Provider admins manage offers" ON public.offers FOR ALL TO authenticated
  USING (public.has_company_role(auth.uid(), provider_company_id, 'provider_admin'))
  WITH CHECK (public.has_company_role(auth.uid(), provider_company_id, 'provider_admin'));

-- CART ITEMS
CREATE TABLE public.cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  offer_id UUID NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
  qty INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, offer_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cart_items TO authenticated;
GRANT ALL ON public.cart_items TO service_role;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own cart" ON public.cart_items FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- REQUESTS
CREATE TABLE public.requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  employer_company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  status public.request_status NOT NULL DEFAULT 'pending',
  total_all INTEGER NOT NULL,
  note TEXT,
  ai_package_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_at TIMESTAMPTZ,
  decided_by UUID REFERENCES auth.users(id)
);
GRANT SELECT, INSERT, UPDATE ON public.requests TO authenticated;
GRANT ALL ON public.requests TO service_role;
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Employee sees own requests" ON public.requests FOR SELECT TO authenticated
  USING (auth.uid() = employee_id OR public.has_company_role(auth.uid(), employer_company_id, 'employer_admin'));
CREATE POLICY "Employee creates own requests" ON public.requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = employee_id);
CREATE POLICY "Employer updates requests" ON public.requests FOR UPDATE TO authenticated
  USING (public.has_company_role(auth.uid(), employer_company_id, 'employer_admin'));

-- REQUEST ITEMS
CREATE TABLE public.request_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
  offer_id UUID NOT NULL REFERENCES public.offers(id),
  provider_company_id UUID NOT NULL REFERENCES public.companies(id),
  offer_title TEXT NOT NULL,
  price_all INTEGER NOT NULL,
  qty INTEGER NOT NULL DEFAULT 1,
  redemption_code TEXT,
  payment_status TEXT NOT NULL DEFAULT 'pending'
);
GRANT SELECT, INSERT, UPDATE ON public.request_items TO authenticated;
GRANT ALL ON public.request_items TO service_role;
ALTER TABLE public.request_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View request items" ON public.request_items FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.requests r WHERE r.id = request_id AND (
    r.employee_id = auth.uid()
    OR public.has_company_role(auth.uid(), r.employer_company_id, 'employer_admin')
    OR public.has_company_role(auth.uid(), provider_company_id, 'provider_admin')
  ))
);
CREATE POLICY "Insert request items with parent" ON public.request_items FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.requests r WHERE r.id = request_id AND r.employee_id = auth.uid())
);
CREATE POLICY "Provider/employer updates items" ON public.request_items FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.requests r WHERE r.id = request_id AND (
    public.has_company_role(auth.uid(), r.employer_company_id, 'employer_admin')
    OR public.has_company_role(auth.uid(), provider_company_id, 'provider_admin')
  ))
);

-- profile auto-create trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name) VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Seed categories
INSERT INTO public.categories (slug, name_en, name_sq, icon, sort_order) VALUES
  ('wellness', 'Wellness', 'Mirëqenia', 'Heart', 1),
  ('food', 'Food & Dining', 'Ushqim', 'UtensilsCrossed', 2),
  ('travel', 'Travel', 'Udhëtim', 'Plane', 3),
  ('learning', 'Learning', 'Mësim', 'BookOpen', 4),
  ('family', 'Family', 'Familje', 'Users', 5),
  ('tech', 'Tech & Telecom', 'Teknologji', 'Smartphone', 6),
  ('lifestyle', 'Lifestyle', 'Stil Jetese', 'Sparkles', 7);
