-- Corrige vazamento multiempresa em policies públicas e tabelas-filhas sem isolamento por empresa

-- ============================================================================
-- companies
-- ============================================================================
DROP POLICY IF EXISTS "Public can view active companies" ON public.companies;

CREATE POLICY "Anonymous visitors can view active companies"
ON public.companies
FOR SELECT
TO anon
USING (is_active = true);

-- ============================================================================
-- banners
-- ============================================================================
DROP POLICY IF EXISTS "Public can view active banners of active companies" ON public.banners;

CREATE POLICY "Anonymous visitors can view active banners of active companies"
ON public.banners
FOR SELECT
TO anon
USING (
  is_active = true
  AND company_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.companies c
    WHERE c.id = banners.company_id
      AND c.is_active = true
  )
);

-- ============================================================================
-- categories
-- ============================================================================
DROP POLICY IF EXISTS "Public can view categories of active companies" ON public.categories;

CREATE POLICY "Anonymous visitors can view categories of active companies"
ON public.categories
FOR SELECT
TO anon
USING (
  company_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.companies c
    WHERE c.id = categories.company_id
      AND c.is_active = true
  )
);

-- ============================================================================
-- coupons
-- ============================================================================
DROP POLICY IF EXISTS "Public can view active coupons of active companies" ON public.coupons;

CREATE POLICY "Anonymous visitors can view active coupons of active companies"
ON public.coupons
FOR SELECT
TO anon
USING (
  is_active = true
  AND company_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.companies c
    WHERE c.id = coupons.company_id
      AND c.is_active = true
  )
);

-- ============================================================================
-- product_attributes
-- ============================================================================
DROP POLICY IF EXISTS "Public can view active product attributes of active companies" ON public.product_attributes;

CREATE POLICY "Anonymous visitors can view active product attributes of active companies"
ON public.product_attributes
FOR SELECT
TO anon
USING (
  is_active = true
  AND company_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.companies c
    WHERE c.id = product_attributes.company_id
      AND c.is_active = true
  )
);

-- ============================================================================
-- products
-- ============================================================================
DROP POLICY IF EXISTS "Public can view active products of active companies" ON public.products;

CREATE POLICY "Anonymous visitors can view active products of active companies"
ON public.products
FOR SELECT
TO anon
USING (
  is_active = true
  AND company_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.companies c
    WHERE c.id = products.company_id
      AND c.is_active = true
  )
);

-- ============================================================================
-- product_variants
-- ============================================================================
DROP POLICY IF EXISTS "Public can view active product variants of active companies" ON public.product_variants;

CREATE POLICY "Anonymous visitors can view active product variants of active companies"
ON public.product_variants
FOR SELECT
TO anon
USING (
  is_active = true
  AND company_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.companies c
    WHERE c.id = product_variants.company_id
      AND c.is_active = true
  )
);

-- ============================================================================
-- attribute_options
-- ============================================================================
DROP POLICY IF EXISTS "Admins can manage attribute options" ON public.attribute_options;
DROP POLICY IF EXISTS "Public can view attribute options" ON public.attribute_options;

CREATE POLICY "Company admins can manage their attribute options"
ON public.attribute_options
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.product_attributes pa
    WHERE pa.id = attribute_options.attribute_id
      AND pa.company_id IS NOT NULL
      AND public.user_belongs_to_company(auth.uid(), pa.company_id)
      AND public.has_role(auth.uid(), 'admin'::public.app_role)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.product_attributes pa
    WHERE pa.id = attribute_options.attribute_id
      AND pa.company_id IS NOT NULL
      AND public.user_belongs_to_company(auth.uid(), pa.company_id)
      AND public.has_role(auth.uid(), 'admin'::public.app_role)
  )
);

CREATE POLICY "Super admins can manage all attribute options"
ON public.attribute_options
FOR ALL
TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Anonymous visitors can view active attribute options"
ON public.attribute_options
FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1
    FROM public.product_attributes pa
    JOIN public.companies c ON c.id = pa.company_id
    WHERE pa.id = attribute_options.attribute_id
      AND pa.is_active = true
      AND c.is_active = true
  )
);

-- ============================================================================
-- product_variant_options
-- ============================================================================
DROP POLICY IF EXISTS "Admins can manage product variant options" ON public.product_variant_options;
DROP POLICY IF EXISTS "Public can view product variant options" ON public.product_variant_options;

CREATE POLICY "Company admins can manage their product variant options"
ON public.product_variant_options
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.product_variants pv
    WHERE pv.id = product_variant_options.variant_id
      AND pv.company_id IS NOT NULL
      AND public.user_belongs_to_company(auth.uid(), pv.company_id)
      AND public.has_role(auth.uid(), 'admin'::public.app_role)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.product_variants pv
    WHERE pv.id = product_variant_options.variant_id
      AND pv.company_id IS NOT NULL
      AND public.user_belongs_to_company(auth.uid(), pv.company_id)
      AND public.has_role(auth.uid(), 'admin'::public.app_role)
  )
);

CREATE POLICY "Super admins can manage all product variant options"
ON public.product_variant_options
FOR ALL
TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Anonymous visitors can view active product variant options"
ON public.product_variant_options
FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1
    FROM public.product_variants pv
    JOIN public.products p ON p.id = pv.product_id
    JOIN public.companies c ON c.id = p.company_id
    WHERE pv.id = product_variant_options.variant_id
      AND pv.is_active = true
      AND p.is_active = true
      AND c.is_active = true
  )
);

-- ============================================================================
-- user_roles
-- ============================================================================
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;

CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_super_admin(auth.uid())
);

CREATE POLICY "Super admins can manage all user roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));