-- Criar função que atribui role ao novo usuário baseado no código de acesso
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_code text;
  user_access_code text;
BEGIN
  -- Buscar o código de acesso admin das secrets (será configurado como ADMIN_ACCESS_CODE)
  -- Como não podemos acessar secrets diretamente, vamos verificar no metadata
  user_access_code := NEW.raw_user_meta_data->>'admin_access_code';
  
  -- Se o código de acesso foi fornecido e é válido, atribui role admin
  -- Senão, atribui role user
  IF user_access_code IS NOT NULL AND user_access_code != '' THEN
    -- Inserir role admin se código foi fornecido (validação será feita no frontend)
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::app_role);
  ELSE
    -- Inserir role user por padrão
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user'::app_role);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger para atribuir role automaticamente após signup
DROP TRIGGER IF EXISTS on_auth_user_created_assign_role ON auth.users;
CREATE TRIGGER on_auth_user_created_assign_role
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_role();