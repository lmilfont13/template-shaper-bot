-- Adicionar campo para armazenar a URL da logo da empresa
ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS company_logo_url TEXT;

COMMENT ON COLUMN public.employees.company_logo_url IS 'URL da logo da empresa no storage';