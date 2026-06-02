CREATE POLICY "Company admins can view their company members"
ON public.company_users
FOR SELECT
TO authenticated
USING (
  public.user_belongs_to_company(auth.uid(), company_id)
);