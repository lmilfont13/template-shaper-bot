-- Adicionar novos campos para o cadastro de funcionários
ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS store_name TEXT,
ADD COLUMN IF NOT EXISTS rg TEXT,
ADD COLUMN IF NOT EXISTS cpf TEXT,
ADD COLUMN IF NOT EXISTS letter_issue_date DATE,
ADD COLUMN IF NOT EXISTS company TEXT;

-- Adicionar comentários para documentação
COMMENT ON COLUMN public.employees.store_name IS 'Nome da loja onde o funcionário trabalha';
COMMENT ON COLUMN public.employees.rg IS 'Número do RG do funcionário';
COMMENT ON COLUMN public.employees.cpf IS 'Número do CPF do funcionário';
COMMENT ON COLUMN public.employees.letter_issue_date IS 'Data de emissão da carta';
COMMENT ON COLUMN public.employees.company IS 'Nome da empresa empregadora';