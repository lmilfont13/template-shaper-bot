-- Create coligadas table
CREATE TABLE public.coligadas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  company_logo_url TEXT,
  signature_url TEXT,
  stamp_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.coligadas ENABLE ROW LEVEL SECURITY;

-- RLS Policies for coligadas
CREATE POLICY "Authenticated users can view coligadas"
ON public.coligadas
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Only admins can create coligadas"
ON public.coligadas
FOR INSERT
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Only admins can update coligadas"
ON public.coligadas
FOR UPDATE
USING (is_admin(auth.uid()));

CREATE POLICY "Only admins can delete coligadas"
ON public.coligadas
FOR DELETE
USING (is_admin(auth.uid()));

-- Add trigger for updated_at
CREATE TRIGGER update_coligadas_updated_at
BEFORE UPDATE ON public.coligadas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add coligada_id and coligada_name to generated_documents
ALTER TABLE public.generated_documents
ADD COLUMN coligada_id UUID REFERENCES public.coligadas(id),
ADD COLUMN coligada_name TEXT;