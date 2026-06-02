-- Allow company admins to list all users linked to their own company.
-- Without this policy, /users only sees the current user's own company_users row,
-- even when other members are correctly linked to the same company.
CREATE POLICY "Company admins can view company users of their company"
ON public.company_users
FOR SELECT
USING (
  company_id IS NOT NULL
  AND public.user_belongs_to_company(auth.uid(), company_id)
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);
