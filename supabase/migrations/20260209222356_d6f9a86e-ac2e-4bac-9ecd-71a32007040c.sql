
-- Fix 1: Remove overly permissive employee SELECT policy
DROP POLICY IF EXISTS "Authenticated users can view employees" ON public.employees;

-- Fix 1b: Remove overly permissive template SELECT policy (same issue pattern)
DROP POLICY IF EXISTS "Authenticated users can view templates" ON public.document_templates;

-- Fix 4: Make documents storage bucket private
UPDATE storage.buckets SET public = false WHERE name = 'documents';

-- Fix 4b: Drop overly permissive storage policies
DROP POLICY IF EXISTS "Todos podem fazer upload de documentos" ON storage.objects;
DROP POLICY IF EXISTS "Todos podem visualizar documentos" ON storage.objects;
DROP POLICY IF EXISTS "Todos podem atualizar documentos" ON storage.objects;
DROP POLICY IF EXISTS "Todos podem deletar documentos" ON storage.objects;

-- Fix 4c: Add proper storage policies
CREATE POLICY "Admins can manage all documents storage"
ON storage.objects
FOR ALL
USING (
  bucket_id = 'documents' AND
  public.is_admin(auth.uid())
)
WITH CHECK (
  bucket_id = 'documents' AND
  public.is_admin(auth.uid())
);

-- Authenticated users can read documents (for viewing their generated docs)
CREATE POLICY "Authenticated users can read documents storage"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'documents' AND
  auth.uid() IS NOT NULL
);

-- Authenticated users can upload to documents bucket
CREATE POLICY "Authenticated users can upload documents"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'documents' AND
  auth.uid() IS NOT NULL
);

-- Fix 2b: Create rate limiting table for admin code attempts
CREATE TABLE IF NOT EXISTS public.admin_code_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  ip_address TEXT,
  success BOOLEAN NOT NULL DEFAULT false,
  attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.admin_code_attempts ENABLE ROW LEVEL SECURITY;

-- Only service role can access this table (edge functions use service role)
CREATE POLICY "No direct access to admin_code_attempts"
ON public.admin_code_attempts
FOR ALL
USING (false);
