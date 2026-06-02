-- RPC that returns user emails only when called by a super admin
-- This function uses `is_super_admin(auth.uid())` to restrict access.
CREATE OR REPLACE FUNCTION public.get_user_emails_superadmin(user_ids uuid[])
RETURNS TABLE(id uuid, email text)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  -- Only allow super admins to retrieve emails
  IF NOT is_super_admin(auth.uid()) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT u.id, u.email
  FROM auth.users u
  WHERE u.id = ANY(user_ids);
END;
$$;

-- Optionally grant execute to a role if you want public access for testing:
-- GRANT EXECUTE ON FUNCTION public.get_user_emails_superadmin(uuid[]) TO anon;
