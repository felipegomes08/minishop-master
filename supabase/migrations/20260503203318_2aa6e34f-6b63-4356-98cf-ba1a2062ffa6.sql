-- 1. Restrict cost_price column from anonymous users (defense in depth)
REVOKE SELECT (cost_price) ON public.products FROM anon;

-- 2. Remove anonymous SELECT policy on coupons (codes should not be enumerable)
DROP POLICY IF EXISTS "Anonymous visitors can view active coupons of active companies" ON public.coupons;

-- 3. Tighten product-images storage policies to enforce company scoping via path prefix
DROP POLICY IF EXISTS "Authenticated users can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete product images" ON storage.objects;

CREATE POLICY "Company admins can upload product images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'product-images'
    AND (
      public.is_super_admin(auth.uid())
      OR (
        ((storage.foldername(name))[1]) IS NOT NULL
        AND public.user_belongs_to_company(auth.uid(), ((storage.foldername(name))[1])::uuid)
        AND public.has_role(auth.uid(), 'admin'::app_role)
      )
    )
  );

CREATE POLICY "Company admins can update their product images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'product-images'
    AND (
      public.is_super_admin(auth.uid())
      OR (
        ((storage.foldername(name))[1]) IS NOT NULL
        AND public.user_belongs_to_company(auth.uid(), ((storage.foldername(name))[1])::uuid)
        AND public.has_role(auth.uid(), 'admin'::app_role)
      )
    )
  );

CREATE POLICY "Company admins can delete their product images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'product-images'
    AND (
      public.is_super_admin(auth.uid())
      OR (
        ((storage.foldername(name))[1]) IS NOT NULL
        AND public.user_belongs_to_company(auth.uid(), ((storage.foldername(name))[1])::uuid)
        AND public.has_role(auth.uid(), 'admin'::app_role)
      )
    )
  );