-- Allow authenticated users to view employees (needed for document generation)
CREATE POLICY "Authenticated users can view employees" 
ON public.employees 
FOR SELECT 
USING (auth.uid() IS NOT NULL);