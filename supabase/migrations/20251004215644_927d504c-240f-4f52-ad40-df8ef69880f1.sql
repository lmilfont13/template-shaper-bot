-- Remove the policy that allows all authenticated users to view templates
DROP POLICY IF EXISTS "Authenticated users can view templates" ON public.document_templates;

-- Create new policy: only admins can view templates
CREATE POLICY "Only admins can view templates"
ON public.document_templates
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));