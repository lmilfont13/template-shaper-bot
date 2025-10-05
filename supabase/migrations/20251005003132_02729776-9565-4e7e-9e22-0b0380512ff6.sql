-- Atualizar função para sempre atribuir role "user" por padrão
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Sempre atribuir role "user" por padrão ao criar novo usuário
  -- A validação do código admin será feita via edge function após o signup
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user'::app_role);
  
  RETURN NEW;
END;
$$;