-- Adicionar novos campos à tabela employees
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS numero_carteira_trabalho TEXT,
ADD COLUMN IF NOT EXISTS coligada_id UUID REFERENCES public.coligadas(id),
ADD COLUMN IF NOT EXISTS agencia TEXT;