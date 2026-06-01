DROP FUNCTION IF EXISTS public.get_user_emails_superadmin(uuid[]);

CREATE OR REPLACE FUNCTION public.get_user_emails_superadmin(user_ids uuid[])
RETURNS TABLE(user_id uuid, email text, name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
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
  WHERE u.id = ANY(user_ids);
END;$$;

GRANT EXECUTE ON FUNCTION public.get_user_emails_superadmin(uuid[]) TO authenticated;