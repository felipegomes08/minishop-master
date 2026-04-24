
-- ============================================================================
-- FIX CRÍTICO: Vazamento de dados entre empresas
-- sale_items e customer_coupons só verificavam o role 'admin', sem checar
-- a empresa do registro. Isso permitia que um admin de uma empresa visse
-- dados de outra. Agora cada acesso valida company_id via JOIN com a tabela
-- pai (sales / customers / coupons).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- sale_items: isolar por company_id da venda pai
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can manage sale items" ON public.sale_items;

CREATE POLICY "Company admins can manage their sale items"
ON public.sale_items
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.sales s
    WHERE s.id = sale_items.sale_id
      AND s.company_id IS NOT NULL
      AND public.user_belongs_to_company(auth.uid(), s.company_id)
      AND public.has_role(auth.uid(), 'admin'::public.app_role)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.sales s
    WHERE s.id = sale_items.sale_id
      AND s.company_id IS NOT NULL
      AND public.user_belongs_to_company(auth.uid(), s.company_id)
      AND public.has_role(auth.uid(), 'admin'::public.app_role)
  )
);

CREATE POLICY "Super admins can manage all sale items"
ON public.sale_items
FOR ALL
TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

-- ----------------------------------------------------------------------------
-- customer_coupons: isolar por company_id (customer e coupon devem pertencer
-- à mesma empresa do usuário)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can manage customer coupons" ON public.customer_coupons;

CREATE POLICY "Company admins can manage their customer coupons"
ON public.customer_coupons
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.customers c
    WHERE c.id = customer_coupons.customer_id
      AND c.company_id IS NOT NULL
      AND public.user_belongs_to_company(auth.uid(), c.company_id)
      AND public.has_role(auth.uid(), 'admin'::public.app_role)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.customers c
    WHERE c.id = customer_coupons.customer_id
      AND c.company_id IS NOT NULL
      AND public.user_belongs_to_company(auth.uid(), c.company_id)
      AND public.has_role(auth.uid(), 'admin'::public.app_role)
  )
  AND EXISTS (
    SELECT 1 FROM public.coupons cp
    WHERE cp.id = customer_coupons.coupon_id
      AND cp.company_id IS NOT NULL
      AND public.user_belongs_to_company(auth.uid(), cp.company_id)
  )
);

CREATE POLICY "Super admins can manage all customer coupons"
ON public.customer_coupons
FOR ALL
TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

-- ----------------------------------------------------------------------------
-- store_settings: tabela legada (substituída por companies). Restringir
-- acesso público e gravação a super admins, evitando vazamento.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can view store settings" ON public.store_settings;
DROP POLICY IF EXISTS "Admins can manage store settings" ON public.store_settings;

CREATE POLICY "Super admins can manage store settings"
ON public.store_settings
FOR ALL
TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));
