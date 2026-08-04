DO $$
DECLARE p record; stmt text;
BEGIN
  FOR p IN
    SELECT pol.tablename AS tname, pol.policyname AS pname, pol.permissive AS perm,
           pol.cmd AS pcmd, pol.qual AS pqual, pol.with_check AS pcheck
    FROM pg_policies pol
    WHERE pol.schemaname='public'
      AND 'public' = ANY(pol.roles)
      AND (pol.qual ILIKE '%is_super_admin%' OR pol.with_check ILIKE '%is_super_admin%'
        OR pol.qual ILIKE '%user_belongs_to_company%' OR pol.with_check ILIKE '%user_belongs_to_company%'
        OR pol.qual ILIKE '%has_company_role%' OR pol.with_check ILIKE '%has_company_role%'
        OR pol.qual ILIKE '%has_role%' OR pol.with_check ILIKE '%has_role%')
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', p.pname, p.tname);
    stmt := format('CREATE POLICY %I ON public.%I AS %s FOR %s TO authenticated',
      p.pname, p.tname,
      CASE WHEN p.perm='PERMISSIVE' THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END,
      p.pcmd);
    IF p.pqual IS NOT NULL THEN stmt := stmt || format(' USING (%s)', p.pqual); END IF;
    IF p.pcheck IS NOT NULL THEN stmt := stmt || format(' WITH CHECK (%s)', p.pcheck); END IF;
    EXECUTE stmt;
  END LOOP;
END $$;