-- Create a SECURITY DEFINER function to return user emails for a list of ids
-- This runs with DB privileges and allows the client to call it safely.
CREATE OR REPLACE FUNCTION public.get_user_emails(user_ids uuid[])
RETURNS TABLE(id uuid, email text)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT u.id, u.email
  FROM auth.users u
  WHERE u.id = ANY(user_ids);
$$;

-- Grant execute to anon (optional) or rely on RLS and function security.
-- If you want public/anon to call it from client, run:
-- GRANT EXECUTE ON FUNCTION public.get_user_emails(uuid[]) TO anon;
