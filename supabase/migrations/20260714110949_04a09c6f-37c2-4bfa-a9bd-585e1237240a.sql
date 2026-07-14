
-- 1. Company-scoped role helper
CREATE OR REPLACE FUNCTION public.has_company_role(_user_id uuid, _company_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_users
    WHERE user_id = _user_id
      AND company_id = _company_id
      AND role = _role
  )
$$;

REVOKE EXECUTE ON FUNCTION public.has_company_role(uuid, uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_company_role(uuid, uuid, public.app_role) TO authenticated, service_role;

-- 2. Replace policies using has_role() with has_company_role() (company-scoped)

-- products
DROP POLICY IF EXISTS "Company admins can manage their products" ON public.products;
CREATE POLICY "Company admins can manage their products" ON public.products
  FOR ALL TO authenticated
  USING (company_id IS NOT NULL AND public.has_company_role(auth.uid(), company_id, 'admin'::public.app_role))
  WITH CHECK (company_id IS NOT NULL AND public.has_company_role(auth.uid(), company_id, 'admin'::public.app_role));

-- categories
DROP POLICY IF EXISTS "Company admins can manage their categories" ON public.categories;
CREATE POLICY "Company admins can manage their categories" ON public.categories
  FOR ALL TO authenticated
  USING (company_id IS NOT NULL AND public.has_company_role(auth.uid(), company_id, 'admin'::public.app_role))
  WITH CHECK (company_id IS NOT NULL AND public.has_company_role(auth.uid(), company_id, 'admin'::public.app_role));

-- banners
DROP POLICY IF EXISTS "Company admins can manage their banners" ON public.banners;
CREATE POLICY "Company admins can manage their banners" ON public.banners
  FOR ALL TO authenticated
  USING (company_id IS NOT NULL AND public.has_company_role(auth.uid(), company_id, 'admin'::public.app_role))
  WITH CHECK (company_id IS NOT NULL AND public.has_company_role(auth.uid(), company_id, 'admin'::public.app_role));

-- customers
DROP POLICY IF EXISTS "Company admins can manage their customers" ON public.customers;
CREATE POLICY "Company admins can manage their customers" ON public.customers
  FOR ALL TO authenticated
  USING (company_id IS NOT NULL AND public.has_company_role(auth.uid(), company_id, 'admin'::public.app_role))
  WITH CHECK (company_id IS NOT NULL AND public.has_company_role(auth.uid(), company_id, 'admin'::public.app_role));

-- expenses
DROP POLICY IF EXISTS "Company admins can manage their expenses" ON public.expenses;
CREATE POLICY "Company admins can manage their expenses" ON public.expenses
  FOR ALL TO authenticated
  USING (company_id IS NOT NULL AND public.has_company_role(auth.uid(), company_id, 'admin'::public.app_role))
  WITH CHECK (company_id IS NOT NULL AND public.has_company_role(auth.uid(), company_id, 'admin'::public.app_role));

-- coupons
DROP POLICY IF EXISTS "Company admins can manage their coupons" ON public.coupons;
CREATE POLICY "Company admins can manage their coupons" ON public.coupons
  FOR ALL TO authenticated
  USING (company_id IS NOT NULL AND public.has_company_role(auth.uid(), company_id, 'admin'::public.app_role))
  WITH CHECK (company_id IS NOT NULL AND public.has_company_role(auth.uid(), company_id, 'admin'::public.app_role));

-- product_attributes
DROP POLICY IF EXISTS "Company admins can manage their product attributes" ON public.product_attributes;
CREATE POLICY "Company admins can manage their product attributes" ON public.product_attributes
  FOR ALL TO authenticated
  USING (company_id IS NOT NULL AND public.has_company_role(auth.uid(), company_id, 'admin'::public.app_role))
  WITH CHECK (company_id IS NOT NULL AND public.has_company_role(auth.uid(), company_id, 'admin'::public.app_role));

-- product_variants
DROP POLICY IF EXISTS "Company admins can manage their product variants" ON public.product_variants;
CREATE POLICY "Company admins can manage their product variants" ON public.product_variants
  FOR ALL TO authenticated
  USING (company_id IS NOT NULL AND public.has_company_role(auth.uid(), company_id, 'admin'::public.app_role))
  WITH CHECK (company_id IS NOT NULL AND public.has_company_role(auth.uid(), company_id, 'admin'::public.app_role));

-- attribute_options (join through product_attributes)
DROP POLICY IF EXISTS "Company admins can manage their attribute options" ON public.attribute_options;
CREATE POLICY "Company admins can manage their attribute options" ON public.attribute_options
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.product_attributes pa
    WHERE pa.id = attribute_options.attribute_id
      AND pa.company_id IS NOT NULL
      AND public.has_company_role(auth.uid(), pa.company_id, 'admin'::public.app_role)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.product_attributes pa
    WHERE pa.id = attribute_options.attribute_id
      AND pa.company_id IS NOT NULL
      AND public.has_company_role(auth.uid(), pa.company_id, 'admin'::public.app_role)
  ));

-- product_variant_options (join through product_variants)
DROP POLICY IF EXISTS "Company admins can manage their product variant options" ON public.product_variant_options;
CREATE POLICY "Company admins can manage their product variant options" ON public.product_variant_options
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.product_variants pv
    WHERE pv.id = product_variant_options.variant_id
      AND pv.company_id IS NOT NULL
      AND public.has_company_role(auth.uid(), pv.company_id, 'admin'::public.app_role)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.product_variants pv
    WHERE pv.id = product_variant_options.variant_id
      AND pv.company_id IS NOT NULL
      AND public.has_company_role(auth.uid(), pv.company_id, 'admin'::public.app_role)
  ));

-- customer_coupons (join through customers/coupons)
DROP POLICY IF EXISTS "Company admins can manage their customer coupons" ON public.customer_coupons;
CREATE POLICY "Company admins can manage their customer coupons" ON public.customer_coupons
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.customers c
    WHERE c.id = customer_coupons.customer_id
      AND c.company_id IS NOT NULL
      AND public.has_company_role(auth.uid(), c.company_id, 'admin'::public.app_role)
  ))
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.id = customer_coupons.customer_id
        AND c.company_id IS NOT NULL
        AND public.has_company_role(auth.uid(), c.company_id, 'admin'::public.app_role)
    )
    AND EXISTS (
      SELECT 1 FROM public.coupons cp
      WHERE cp.id = customer_coupons.coupon_id
        AND cp.company_id IS NOT NULL
        AND public.user_belongs_to_company(auth.uid(), cp.company_id)
    )
  );

-- sale_items (join through sales)
DROP POLICY IF EXISTS "Company admins can manage their sale items" ON public.sale_items;
CREATE POLICY "Company admins can manage their sale items" ON public.sale_items
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.sales s
    WHERE s.id = sale_items.sale_id
      AND s.company_id IS NOT NULL
      AND public.has_company_role(auth.uid(), s.company_id, 'admin'::public.app_role)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.sales s
    WHERE s.id = sale_items.sale_id
      AND s.company_id IS NOT NULL
      AND public.has_company_role(auth.uid(), s.company_id, 'admin'::public.app_role)
  ));

-- sales
DROP POLICY IF EXISTS "Company admins can manage their sales" ON public.sales;
CREATE POLICY "Company admins can manage their sales" ON public.sales
  FOR ALL TO authenticated
  USING (company_id IS NOT NULL AND public.has_company_role(auth.uid(), company_id, 'admin'::public.app_role))
  WITH CHECK (company_id IS NOT NULL AND public.has_company_role(auth.uid(), company_id, 'admin'::public.app_role));

-- user_menu_permissions (scope by the company_users membership of the target user)
DROP POLICY IF EXISTS "Company admins can manage user menu permissions" ON public.user_menu_permissions;
CREATE POLICY "Company admins can manage user menu permissions" ON public.user_menu_permissions
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.company_users cu
    WHERE cu.user_id = user_menu_permissions.user_id
      AND public.has_company_role(auth.uid(), cu.company_id, 'admin'::public.app_role)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.company_users cu
    WHERE cu.user_id = user_menu_permissions.user_id
      AND public.has_company_role(auth.uid(), cu.company_id, 'admin'::public.app_role)
  ));

-- 3. Storage policies (expense-receipts + product-images) — replace has_role with has_company_role
DROP POLICY IF EXISTS "Company admins can view their expense receipts" ON storage.objects;
CREATE POLICY "Company admins can view their expense receipts" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'expense-receipts'
    AND (
      public.is_super_admin(auth.uid())
      OR (
        (storage.foldername(name))[1] IS NOT NULL
        AND public.has_company_role(auth.uid(), ((storage.foldername(name))[1])::uuid, 'admin'::public.app_role)
      )
    )
  );

DROP POLICY IF EXISTS "Company admins can update their expense receipts" ON storage.objects;
CREATE POLICY "Company admins can update their expense receipts" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'expense-receipts'
    AND (
      public.is_super_admin(auth.uid())
      OR (
        (storage.foldername(name))[1] IS NOT NULL
        AND public.has_company_role(auth.uid(), ((storage.foldername(name))[1])::uuid, 'admin'::public.app_role)
      )
    )
  );

DROP POLICY IF EXISTS "Company admins can delete their expense receipts" ON storage.objects;
CREATE POLICY "Company admins can delete their expense receipts" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'expense-receipts'
    AND (
      public.is_super_admin(auth.uid())
      OR (
        (storage.foldername(name))[1] IS NOT NULL
        AND public.has_company_role(auth.uid(), ((storage.foldername(name))[1])::uuid, 'admin'::public.app_role)
      )
    )
  );

DROP POLICY IF EXISTS "Company admins can update their product images" ON storage.objects;
CREATE POLICY "Company admins can update their product images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'product-images'
    AND (
      public.is_super_admin(auth.uid())
      OR (
        (storage.foldername(name))[1] IS NOT NULL
        AND public.has_company_role(auth.uid(), ((storage.foldername(name))[1])::uuid, 'admin'::public.app_role)
      )
    )
  );

DROP POLICY IF EXISTS "Company admins can delete their product images" ON storage.objects;
CREATE POLICY "Company admins can delete their product images" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'product-images'
    AND (
      public.is_super_admin(auth.uid())
      OR (
        (storage.foldername(name))[1] IS NOT NULL
        AND public.has_company_role(auth.uid(), ((storage.foldername(name))[1])::uuid, 'admin'::public.app_role)
      )
    )
  );

-- 4. Drop broad public SELECT policy on product-images bucket.
--    Bucket remains public so files are still served via public URLs, but
--    unauthenticated callers can no longer list every file in the bucket.
DROP POLICY IF EXISTS "Product images are publicly accessible" ON storage.objects;

-- 5. store_settings: allow storefront visitors (anon + authenticated) to read platform branding.
CREATE POLICY "Anyone can read store settings" ON public.store_settings
  FOR SELECT
  TO anon, authenticated
  USING (true);

GRANT SELECT ON public.store_settings TO anon;

-- 6. Restrict EXECUTE on SECURITY DEFINER helpers: authenticated + service_role only.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.is_super_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_super_admin(uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.user_belongs_to_company(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.user_belongs_to_company(uuid, uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_user_company_id(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_company_id(uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_user_emails_superadmin(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_emails_superadmin(uuid[]) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_company_user_emails(uuid, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_company_user_emails(uuid, uuid[]) TO authenticated, service_role;

-- Trigger-only function: not callable via API by any client role.
REVOKE EXECUTE ON FUNCTION public.sync_company_plan_from_subscription() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_company_plan_from_subscription() TO service_role;
