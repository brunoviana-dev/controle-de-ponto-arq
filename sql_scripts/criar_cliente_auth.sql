-- Função para criar usuário no Supabase Auth a partir de um cliente existente
-- Esta função possui SECURITY DEFINER para poder manipular o schema 'auth'
CREATE OR REPLACE FUNCTION public.criar_cliente_auth(
    p_email text,
    p_password text,
    p_cliente_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  new_user_id uuid;
  v_count int;
BEGIN
  -- 1. Verificar se já existe um usuário com este email
  SELECT count(*) INTO v_count FROM auth.users WHERE email = p_email;
  
  IF v_count > 0 THEN
    -- Se já existe, pegamos o ID desse usuário
    SELECT id INTO new_user_id FROM auth.users WHERE email = p_email;
  ELSE
    -- 2. Se não existe, inserimos em auth.users
    INSERT INTO auth.users (
      id,
      instance_id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmed_at,
      is_super_admin
    )
    VALUES (
      gen_random_uuid(),
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      p_email,
      crypt(p_password, gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{}',
      now(),
      now(),
      now(),
      false
    )
    RETURNING id INTO new_user_id;

    -- 3. Inserir em auth.identities
    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    )
    VALUES (
      new_user_id,
      new_user_id,
      format('{"sub":"%s","email":"%s"}', new_user_id::text, p_email)::jsonb,
      'email',
      p_email,
      now(),
      now(),
      now()
    );
  END IF;

  -- 4. Vincular ao cliente
  UPDATE public.clientes 
  SET auth_user_id = new_user_id 
  WHERE id = p_cliente_id;

  RETURN new_user_id;
END;
$$;
