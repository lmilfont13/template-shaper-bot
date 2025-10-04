-- Create employees table
CREATE TABLE public.employees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  position TEXT,
  department TEXT,
  hire_date DATE,
  salary DECIMAL(10,2),
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  emergency_contact TEXT,
  emergency_phone TEXT,
  additional_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Todos podem visualizar funcionários" 
ON public.employees 
FOR SELECT 
USING (true);

CREATE POLICY "Todos podem criar funcionários" 
ON public.employees 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Todos podem atualizar funcionários" 
ON public.employees 
FOR UPDATE 
USING (true);

CREATE POLICY "Todos podem deletar funcionários" 
ON public.employees 
FOR DELETE 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_employees_updated_at
BEFORE UPDATE ON public.employees
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();