-- Allow authenticated users to view templates (needed for document generation)
-- But only admins can create/update/delete templates
CREATE POLICY "Authenticated users can view templates"
ON public.document_templates
FOR SELECT
TO authenticated
USING (true);