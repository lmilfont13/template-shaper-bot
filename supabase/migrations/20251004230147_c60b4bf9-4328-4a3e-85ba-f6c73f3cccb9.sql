-- Adicionar campo para armazenar o conteúdo do template diretamente
ALTER TABLE public.document_templates
ADD COLUMN IF NOT EXISTS template_content TEXT;

COMMENT ON COLUMN public.document_templates.template_content IS 'Conteúdo do template com placeholders {{campo}}';