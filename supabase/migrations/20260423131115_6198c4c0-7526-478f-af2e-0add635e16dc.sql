INSERT INTO storage.buckets (id, name, public)
VALUES ('expense-receipts', 'expense-receipts', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Company admins can view their expense receipts"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'expense-receipts'
  AND (
    public.is_super_admin(auth.uid())
    OR (
      (storage.foldername(name))[1] IS NOT NULL
      AND public.user_belongs_to_company(auth.uid(), ((storage.foldername(name))[1])::uuid)
      AND public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  )
);

CREATE POLICY "Company admins can upload their expense receipts"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'expense-receipts'
  AND (
    public.is_super_admin(auth.uid())
    OR (
      (storage.foldername(name))[1] IS NOT NULL
      AND public.user_belongs_to_company(auth.uid(), ((storage.foldername(name))[1])::uuid)
      AND public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  )
);

CREATE POLICY "Company admins can update their expense receipts"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'expense-receipts'
  AND (
    public.is_super_admin(auth.uid())
    OR (
      (storage.foldername(name))[1] IS NOT NULL
      AND public.user_belongs_to_company(auth.uid(), ((storage.foldername(name))[1])::uuid)
      AND public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  )
)
WITH CHECK (
  bucket_id = 'expense-receipts'
  AND (
    public.is_super_admin(auth.uid())
    OR (
      (storage.foldername(name))[1] IS NOT NULL
      AND public.user_belongs_to_company(auth.uid(), ((storage.foldername(name))[1])::uuid)
      AND public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  )
);

CREATE POLICY "Company admins can delete their expense receipts"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'expense-receipts'
  AND (
    public.is_super_admin(auth.uid())
    OR (
      (storage.foldername(name))[1] IS NOT NULL
      AND public.user_belongs_to_company(auth.uid(), ((storage.foldername(name))[1])::uuid)
      AND public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  )
);