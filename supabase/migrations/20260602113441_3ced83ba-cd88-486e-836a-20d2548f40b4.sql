CREATE OR REPLACE FUNCTION public.get_company_user_emails(_company_id uuid, user_ids uuid[])
RETURNS TABLE(user_id uuid, email text, name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.is_super_admin(auth.uid())
          OR (public.user_belongs_to_company(auth.uid(), _company_id)
              AND public.has_role(auth.uid(), 'admin'::app_role))) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  RETURN QUERY
  SELECT u.id, u.email::text,
    COALESCE(
      u.raw_user_meta_data->>'name',
      u.raw_user_meta_data->>'full_name',
      u.raw_user_meta_data->>'display_name'
    )::text AS name
  FROM auth.users u
  WHERE u.id = ANY(user_ids)
    AND EXISTS (
      SELECT 1 FROM public.company_users cu
      WHERE cu.user_id = u.id AND cu.company_id = _company_id
    );
END;
$$;