CREATE POLICY "Company admins can update their company"
ON public.companies
FOR UPDATE
TO authenticated
USING (public.user_belongs_to_company(auth.uid(), id) AND public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.user_belongs_to_company(auth.uid(), id) AND public.has_role(auth.uid(), 'admin'::app_role));

GRANT UPDATE ON public.companies TO authenticated;