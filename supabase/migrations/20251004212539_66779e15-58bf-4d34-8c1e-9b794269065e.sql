-- Tabela de templates de documentos
CREATE TABLE public.document_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  google_doc_id TEXT NOT NULL,
  description TEXT,
  fields JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de documentos gerados
CREATE TABLE public.generated_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_name TEXT NOT NULL,
  template_id UUID NOT NULL REFERENCES public.document_templates(id) ON DELETE CASCADE,
  template_name TEXT NOT NULL,
  file_path TEXT,
  data JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para melhor performance
CREATE INDEX idx_generated_documents_employee ON public.generated_documents(employee_name);
CREATE INDEX idx_generated_documents_template ON public.generated_documents(template_id);
CREATE INDEX idx_generated_documents_created ON public.generated_documents(created_at DESC);
CREATE INDEX idx_document_templates_type ON public.document_templates(type);

-- Enable Row Level Security
ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_documents ENABLE ROW LEVEL SECURITY;

-- Políticas públicas (qualquer um pode ler e criar)
CREATE POLICY "Todos podem visualizar templates"
ON public.document_templates FOR SELECT
USING (true);

CREATE POLICY "Todos podem criar templates"
ON public.document_templates FOR INSERT
WITH CHECK (true);

CREATE POLICY "Todos podem atualizar templates"
ON public.document_templates FOR UPDATE
USING (true);

CREATE POLICY "Todos podem deletar templates"
ON public.document_templates FOR DELETE
USING (true);

CREATE POLICY "Todos podem visualizar documentos gerados"
ON public.generated_documents FOR SELECT
USING (true);

CREATE POLICY "Todos podem criar documentos"
ON public.generated_documents FOR INSERT
WITH CHECK (true);

CREATE POLICY "Todos podem atualizar documentos"
ON public.generated_documents FOR UPDATE
USING (true);

CREATE POLICY "Todos podem deletar documentos"
ON public.generated_documents FOR DELETE
USING (true);

-- Função para atualizar timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger para atualizar timestamps automaticamente
CREATE TRIGGER update_document_templates_updated_at
BEFORE UPDATE ON public.document_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Criar bucket de storage para PDFs gerados
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de storage
CREATE POLICY "Todos podem fazer upload de documentos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'documents');

CREATE POLICY "Todos podem visualizar documentos"
ON storage.objects FOR SELECT
USING (bucket_id = 'documents');

CREATE POLICY "Todos podem atualizar documentos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'documents');

CREATE POLICY "Todos podem deletar documentos"
ON storage.objects FOR DELETE
USING (bucket_id = 'documents');