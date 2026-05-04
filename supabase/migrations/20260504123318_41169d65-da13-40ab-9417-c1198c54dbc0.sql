CREATE TABLE public.user_menu_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  company_id UUID NOT NULL,
  menu_key TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, menu_key)
);

CREATE INDEX idx_user_menu_permissions_user ON public.user_menu_permissions(user_id);
CREATE INDEX idx_user_menu_permissions_company ON public.user_menu_permissions(company_id);

ALTER TABLE public.user_menu_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own menu permissions"
ON public.user_menu_permissions
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Company admins can manage menu permissions of their company"
ON public.user_menu_permissions
FOR ALL
USING (company_id IS NOT NULL AND user_belongs_to_company(auth.uid(), company_id) AND has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (company_id IS NOT NULL AND user_belongs_to_company(auth.uid(), company_id) AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Super admins can manage all menu permissions"
ON public.user_menu_permissions
FOR ALL
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));