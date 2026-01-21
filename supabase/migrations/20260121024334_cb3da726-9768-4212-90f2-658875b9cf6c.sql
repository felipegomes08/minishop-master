
-- =============================================
-- FASE 1: ESTRUTURA MULTI-TENANT
-- =============================================

-- 1.1 Criar tabela de empresas
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#4F46E5',
  secondary_color TEXT DEFAULT '#F59E0B',
  whatsapp_number TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1.2 Criar enum e tabela para master admins (super admins)
CREATE TYPE public.master_role AS ENUM ('super_admin');

CREATE TABLE public.master_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role master_role NOT NULL DEFAULT 'super_admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- 1.3 Criar tabela de vínculo empresa-usuário
CREATE TABLE public.company_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, user_id)
);

-- 1.4 Adicionar company_id em todas as tabelas existentes
ALTER TABLE public.products ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.categories ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.banners ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.sales ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.customers ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.coupons ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.product_attributes ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.product_variants ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

-- =============================================
-- FASE 2: FUNÇÕES DE SEGURANÇA
-- =============================================

-- 2.1 Função para verificar super admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.master_admins
    WHERE user_id = _user_id
  )
$$;

-- 2.2 Função para obter company_id do usuário
CREATE OR REPLACE FUNCTION public.get_user_company_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.company_users
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- 2.3 Função para verificar se usuário pertence a uma empresa
CREATE OR REPLACE FUNCTION public.user_belongs_to_company(_user_id uuid, _company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_users
    WHERE user_id = _user_id AND company_id = _company_id
  )
$$;

-- =============================================
-- FASE 3: RLS PARA NOVAS TABELAS
-- =============================================

-- 3.1 RLS para companies
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage all companies"
ON public.companies FOR ALL
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Company users can view their company"
ON public.companies FOR SELECT
USING (user_belongs_to_company(auth.uid(), id));

CREATE POLICY "Public can view active companies"
ON public.companies FOR SELECT
USING (is_active = true);

-- 3.2 RLS para master_admins
ALTER TABLE public.master_admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage master admins"
ON public.master_admins FOR ALL
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Users can view if they are super admin"
ON public.master_admins FOR SELECT
USING (user_id = auth.uid());

-- 3.3 RLS para company_users
ALTER TABLE public.company_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage company users"
ON public.company_users FOR ALL
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Users can view their own company membership"
ON public.company_users FOR SELECT
USING (user_id = auth.uid());

-- =============================================
-- FASE 4: ATUALIZAR RLS DAS TABELAS EXISTENTES
-- =============================================

-- 4.1 Products - Atualizar políticas
DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
DROP POLICY IF EXISTS "Public can view active products" ON public.products;

CREATE POLICY "Super admins can manage all products"
ON public.products FOR ALL
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Company admins can manage their products"
ON public.products FOR ALL
USING (
  company_id IS NOT NULL AND 
  user_belongs_to_company(auth.uid(), company_id) AND 
  has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  company_id IS NOT NULL AND 
  user_belongs_to_company(auth.uid(), company_id) AND 
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Public can view active products of active companies"
ON public.products FOR SELECT
USING (
  is_active = true AND 
  company_id IS NOT NULL AND
  EXISTS (SELECT 1 FROM companies WHERE id = company_id AND is_active = true)
);

-- 4.2 Categories - Atualizar políticas
DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
DROP POLICY IF EXISTS "Public can view categories" ON public.categories;

CREATE POLICY "Super admins can manage all categories"
ON public.categories FOR ALL
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Company admins can manage their categories"
ON public.categories FOR ALL
USING (
  company_id IS NOT NULL AND 
  user_belongs_to_company(auth.uid(), company_id) AND 
  has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  company_id IS NOT NULL AND 
  user_belongs_to_company(auth.uid(), company_id) AND 
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Public can view categories of active companies"
ON public.categories FOR SELECT
USING (
  company_id IS NOT NULL AND
  EXISTS (SELECT 1 FROM companies WHERE id = company_id AND is_active = true)
);

-- 4.3 Banners - Atualizar políticas
DROP POLICY IF EXISTS "Admins can manage banners" ON public.banners;
DROP POLICY IF EXISTS "Public can view active banners" ON public.banners;

CREATE POLICY "Super admins can manage all banners"
ON public.banners FOR ALL
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Company admins can manage their banners"
ON public.banners FOR ALL
USING (
  company_id IS NOT NULL AND 
  user_belongs_to_company(auth.uid(), company_id) AND 
  has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  company_id IS NOT NULL AND 
  user_belongs_to_company(auth.uid(), company_id) AND 
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Public can view active banners of active companies"
ON public.banners FOR SELECT
USING (
  is_active = true AND 
  company_id IS NOT NULL AND
  EXISTS (SELECT 1 FROM companies WHERE id = company_id AND is_active = true)
);

-- 4.4 Sales - Atualizar políticas
DROP POLICY IF EXISTS "Admins can manage sales" ON public.sales;

CREATE POLICY "Super admins can manage all sales"
ON public.sales FOR ALL
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Company admins can manage their sales"
ON public.sales FOR ALL
USING (
  company_id IS NOT NULL AND 
  user_belongs_to_company(auth.uid(), company_id) AND 
  has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  company_id IS NOT NULL AND 
  user_belongs_to_company(auth.uid(), company_id) AND 
  has_role(auth.uid(), 'admin'::app_role)
);

-- 4.5 Customers - Atualizar políticas
DROP POLICY IF EXISTS "Admins can manage customers" ON public.customers;

CREATE POLICY "Super admins can manage all customers"
ON public.customers FOR ALL
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Company admins can manage their customers"
ON public.customers FOR ALL
USING (
  company_id IS NOT NULL AND 
  user_belongs_to_company(auth.uid(), company_id) AND 
  has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  company_id IS NOT NULL AND 
  user_belongs_to_company(auth.uid(), company_id) AND 
  has_role(auth.uid(), 'admin'::app_role)
);

-- 4.6 Coupons - Atualizar políticas
DROP POLICY IF EXISTS "Admins can manage coupons" ON public.coupons;
DROP POLICY IF EXISTS "Public can view active coupons" ON public.coupons;

CREATE POLICY "Super admins can manage all coupons"
ON public.coupons FOR ALL
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Company admins can manage their coupons"
ON public.coupons FOR ALL
USING (
  company_id IS NOT NULL AND 
  user_belongs_to_company(auth.uid(), company_id) AND 
  has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  company_id IS NOT NULL AND 
  user_belongs_to_company(auth.uid(), company_id) AND 
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Public can view active coupons of active companies"
ON public.coupons FOR SELECT
USING (
  is_active = true AND 
  company_id IS NOT NULL AND
  EXISTS (SELECT 1 FROM companies WHERE id = company_id AND is_active = true)
);

-- 4.7 Product Attributes - Atualizar políticas
DROP POLICY IF EXISTS "Admins can manage product attributes" ON public.product_attributes;
DROP POLICY IF EXISTS "Public can view active product attributes" ON public.product_attributes;

CREATE POLICY "Super admins can manage all product attributes"
ON public.product_attributes FOR ALL
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Company admins can manage their product attributes"
ON public.product_attributes FOR ALL
USING (
  company_id IS NOT NULL AND 
  user_belongs_to_company(auth.uid(), company_id) AND 
  has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  company_id IS NOT NULL AND 
  user_belongs_to_company(auth.uid(), company_id) AND 
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Public can view active product attributes of active companies"
ON public.product_attributes FOR SELECT
USING (
  is_active = true AND 
  company_id IS NOT NULL AND
  EXISTS (SELECT 1 FROM companies WHERE id = company_id AND is_active = true)
);

-- 4.8 Product Variants - Atualizar políticas
DROP POLICY IF EXISTS "Admins can manage product variants" ON public.product_variants;
DROP POLICY IF EXISTS "Public can view active product variants" ON public.product_variants;

CREATE POLICY "Super admins can manage all product variants"
ON public.product_variants FOR ALL
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Company admins can manage their product variants"
ON public.product_variants FOR ALL
USING (
  company_id IS NOT NULL AND 
  user_belongs_to_company(auth.uid(), company_id) AND 
  has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  company_id IS NOT NULL AND 
  user_belongs_to_company(auth.uid(), company_id) AND 
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Public can view active product variants of active companies"
ON public.product_variants FOR SELECT
USING (
  is_active = true AND 
  company_id IS NOT NULL AND
  EXISTS (SELECT 1 FROM companies WHERE id = company_id AND is_active = true)
);

-- =============================================
-- FASE 5: TRIGGERS
-- =============================================

-- Trigger para updated_at em companies
CREATE TRIGGER update_companies_updated_at
BEFORE UPDATE ON public.companies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- FASE 6: ÍNDICES PARA PERFORMANCE
-- =============================================

CREATE INDEX idx_products_company_id ON public.products(company_id);
CREATE INDEX idx_categories_company_id ON public.categories(company_id);
CREATE INDEX idx_banners_company_id ON public.banners(company_id);
CREATE INDEX idx_sales_company_id ON public.sales(company_id);
CREATE INDEX idx_customers_company_id ON public.customers(company_id);
CREATE INDEX idx_coupons_company_id ON public.coupons(company_id);
CREATE INDEX idx_product_attributes_company_id ON public.product_attributes(company_id);
CREATE INDEX idx_product_variants_company_id ON public.product_variants(company_id);
CREATE INDEX idx_company_users_user_id ON public.company_users(user_id);
CREATE INDEX idx_company_users_company_id ON public.company_users(company_id);
CREATE INDEX idx_master_admins_user_id ON public.master_admins(user_id);
CREATE INDEX idx_companies_slug ON public.companies(slug);
