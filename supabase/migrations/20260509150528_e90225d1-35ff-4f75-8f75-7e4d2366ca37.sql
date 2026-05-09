
-- Storage: documents bucket — restrict to per-user paths for non-admins
DROP POLICY IF EXISTS "Authenticated users can read documents storage" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload documents" ON storage.objects;

CREATE POLICY "Users can read their own document files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents'
  AND (
    public.is_admin(auth.uid())
    OR (storage.foldername(name))[1] = auth.uid()::text
  )
);

CREATE POLICY "Users can upload to their own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND (
    public.is_admin(auth.uid())
    OR (storage.foldername(name))[1] = auth.uid()::text
  )
);

-- user_roles: restrictive policy preventing self-elevation to admin
CREATE POLICY "Prevent non-admins from granting admin role"
ON public.user_roles
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (
  role <> 'admin'::app_role
  OR public.is_admin(auth.uid())
);

CREATE POLICY "Prevent non-admins from updating to admin role"
ON public.user_roles
AS RESTRICTIVE
FOR UPDATE
TO authenticated
WITH CHECK (
  role <> 'admin'::app_role
  OR public.is_admin(auth.uid())
);
