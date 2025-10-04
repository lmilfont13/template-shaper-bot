-- Create role enum (admin and user only)
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  role public.app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = 'admin'
  );
$$;

-- RLS policy for user_roles (only admins can manage roles)
CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can view their own role"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

-- Drop existing public policies on employees
DROP POLICY IF EXISTS "Todos podem visualizar funcionários" ON public.employees;
DROP POLICY IF EXISTS "Todos podem criar funcionários" ON public.employees;
DROP POLICY IF EXISTS "Todos podem atualizar funcionários" ON public.employees;
DROP POLICY IF EXISTS "Todos podem deletar funcionários" ON public.employees;

-- New RLS policies for employees (ONLY ADMIN ACCESS)
CREATE POLICY "Only admins can view employees"
ON public.employees
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Only admins can create employees"
ON public.employees
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Only admins can update employees"
ON public.employees
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Only admins can delete employees"
ON public.employees
FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

-- Drop existing public policies on document_templates
DROP POLICY IF EXISTS "Todos podem visualizar templates" ON public.document_templates;
DROP POLICY IF EXISTS "Todos podem criar templates" ON public.document_templates;
DROP POLICY IF EXISTS "Todos podem atualizar templates" ON public.document_templates;
DROP POLICY IF EXISTS "Todos podem deletar templates" ON public.document_templates;

-- New RLS policies for document_templates
CREATE POLICY "Authenticated users can view templates"
ON public.document_templates
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Only admins can create templates"
ON public.document_templates
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Only admins can update templates"
ON public.document_templates
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Only admins can delete templates"
ON public.document_templates
FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

-- Drop existing public policies on generated_documents
DROP POLICY IF EXISTS "Todos podem visualizar documentos gerados" ON public.generated_documents;
DROP POLICY IF EXISTS "Todos podem criar documentos" ON public.generated_documents;
DROP POLICY IF EXISTS "Todos podem atualizar documentos" ON public.generated_documents;
DROP POLICY IF EXISTS "Todos podem deletar documentos" ON public.generated_documents;

-- Add user_id to generated_documents to track who requested the document
ALTER TABLE public.generated_documents 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- New RLS policies for generated_documents
CREATE POLICY "Admins can view all documents"
ON public.generated_documents
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can view their own documents"
ON public.generated_documents
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can create documents"
ON public.generated_documents
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update all documents"
ON public.generated_documents
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete all documents"
ON public.generated_documents
FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));