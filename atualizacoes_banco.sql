-- ==========================================
-- SCRIPT CONSOLIDADO DE TODAS AS ATUALIZAÇÕES
-- ==========================================

-- ATUALIZAÇÃO: add_origem_clientes.sql
-- Adicionar coluna origem à tabela clientes para rastrear fonte (ex: briefing)
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS origem TEXT DEFAULT 'direto';


-- ATUALIZAÇÃO: add_responsavel_empresa.sql
-- Adiciona colunas responsavel_tecnico e registro_profissional na tabela empresas
ALTER TABLE public.empresas
ADD COLUMN IF NOT EXISTS responsavel_tecnico TEXT,
ADD COLUMN IF NOT EXISTS registro_profissional TEXT;


-- ATUALIZAÇÃO: briefing_perguntas.sql
-- Criar tabela de perguntas do briefing
CREATE TABLE IF NOT EXISTS public.briefing_perguntas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pergunta TEXT NOT NULL,
    tipo TEXT NOT NULL, -- texto, textarea, numero, email, telefone, select, radio, checkbox, data
    obrigatorio BOOLEAN DEFAULT false,
    opcoes JSONB, -- Para select, radio, checkbox (array de strings)
    ordem INTEGER NOT NULL,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.briefing_perguntas ENABLE ROW LEVEL SECURITY;

-- Políticas de Segurança (Padrão Admin/Colaborador)
CREATE POLICY "Admin/Colaboradores Acesso Total Briefing Perguntas" 
ON public.briefing_perguntas 
FOR ALL 
USING (auth.uid() IS NULL);

CREATE POLICY "Leitura Pública Briefing Perguntas" 
ON public.briefing_perguntas 
FOR SELECT 
USING (true);


-- ATUALIZAÇÃO: briefing_respostas.sql
-- Criar tabela de respostas do briefing
CREATE TABLE IF NOT EXISTS public.briefing_respostas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome TEXT NOT NULL,
    email TEXT NOT NULL,
    telefone TEXT,
    tipo_projeto_id UUID REFERENCES public.projeto_tipos(id),
    respostas JSONB NOT NULL,
    anexos JSONB DEFAULT '[]'::jsonb,
    status TEXT DEFAULT 'novo' CHECK (status IN ('novo', 'em_contato', 'convertido', 'descartado')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.briefing_respostas ENABLE ROW LEVEL SECURITY;

-- Políticas de Segurança
-- 1. Qualquer pessoa (público) pode inserir uma resposta
CREATE POLICY "Público pode inserir respostas de briefing" 
ON public.briefing_respostas 
FOR INSERT 
WITH CHECK (true);

-- 2. Apenas Admin pode ver/editar (Continuando o padrão do projeto)
CREATE POLICY "Admin Acesso Total Briefing Respostas" 
ON public.briefing_respostas 
FOR ALL 
USING (auth.uid() IS NULL);


-- ATUALIZAÇÃO: contas_pagar.sql
-- Criar tabela de contas a pagar
CREATE TABLE IF NOT EXISTS public.contas_pagar (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    descricao TEXT NOT NULL,
    categoria TEXT,
    valor NUMERIC(12,2) NOT NULL,
    data_vencimento DATE NOT NULL,
    observacoes TEXT,
    recorrente BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.contas_pagar ENABLE ROW LEVEL SECURITY;

-- Políticas de Segurança
-- Seguindo o padrão do projeto:
-- 1. Clientes NÃO acessam esta tabela (nem Select)
-- 2. Admin/Colaboradores (auth.uid() is null no contexto atual do projeto) acessam tudo

CREATE POLICY "Admin/Colaboradores Acesso Total Contas Pagar" 
ON public.contas_pagar 
FOR ALL 
USING (auth.uid() IS NULL);

-- Caso queira restringir apenas a usuários logados (futuro):
-- CREATE POLICY "Acesso apenas para autenticados" ON public.contas_pagar FOR ALL TO authenticated USING (true);


-- ATUALIZAÇÃO: contas_pagar_pagamentos.sql
-- Criar tabela de pagamentos de contas a pagar
CREATE TABLE IF NOT EXISTS public.contas_pagar_pagamentos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conta_id UUID NOT NULL REFERENCES public.contas_pagar(id) ON DELETE CASCADE,
    data_pagamento DATE NOT NULL,
    valor_pago NUMERIC(12,2) NOT NULL,
    mes_referencia INTEGER NOT NULL,
    ano_referencia INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(conta_id, mes_referencia, ano_referencia)
);

-- Habilitar RLS
ALTER TABLE public.contas_pagar_pagamentos ENABLE ROW LEVEL SECURITY;

-- Políticas de Segurança (conforme padrão do projeto)
CREATE POLICY "Admin/Colaboradores Acesso Total Pagamentos Contas" 
ON public.contas_pagar_pagamentos 
FOR ALL 
USING (auth.uid() IS NULL);


-- ATUALIZAÇÃO: criar_cliente_auth.sql
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


-- ATUALIZAÇÃO: fix_empresa_id_null.sql
-- Adiciona o empresa_id padrão para registros que ficaram vazios (NULL) após a migração
-- O ID da empresa padrão usado no código é: 'd520b8bd-502d-49bb-ab87-3bf76a6e51a3'

UPDATE public.projetos 
SET empresa_id = 'd520b8bd-502d-49bb-ab87-3bf76a6e51a3' 
WHERE empresa_id IS NULL;

UPDATE public.projeto_etapas 
SET empresa_id = 'd520b8bd-502d-49bb-ab87-3bf76a6e51a3' 
WHERE empresa_id IS NULL;

UPDATE public.projeto_tipos 
SET empresa_id = 'd520b8bd-502d-49bb-ab87-3bf76a6e51a3' 
WHERE empresa_id IS NULL;

UPDATE public.projeto_tipo_etapas 
SET empresa_id = 'd520b8bd-502d-49bb-ab87-3bf76a6e51a3' 
WHERE empresa_id IS NULL;

UPDATE public.projeto_parcelas 
SET empresa_id = 'd520b8bd-502d-49bb-ab87-3bf76a6e51a3' 
WHERE empresa_id IS NULL;

UPDATE public.contratos_gerados 
SET empresa_id = 'd520b8bd-502d-49bb-ab87-3bf76a6e51a3' 
WHERE empresa_id IS NULL;

UPDATE public.clientes 
SET empresa_id = 'd520b8bd-502d-49bb-ab87-3bf76a6e51a3' 
WHERE empresa_id IS NULL;


-- ATUALIZAÇÃO: fix_rls_etapas.sql
-- ==========================================
-- SCRIPT DE CORREÇÃO DO RLS (ROW LEVEL SECURITY)
-- Problema: Após começar a logar com o Supabase Auth (onde auth.uid() não é nulo), 
-- os administradores/colaboradores pararam de conseguir visualizar dados caso 
-- as políticas confiassem em "auth.uid() IS NULL".
-- ==========================================

-- 1. Habilitar RLS nas tabelas principais
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projetos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projeto_parcelas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contratos_gerados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projeto_etapas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projeto_tipos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projeto_tipo_etapas ENABLE ROW LEVEL SECURITY;

-- 2. Conceder ACESSO TOTAL para Administradores / Colaboradores 
-- A regra: Se o usuário logado no Auth estiver cadastrado na tabela 'colaboradores'
-- ele terá acesso irrestrito aos dados no banco.
CREATE POLICY "Colabs_Total_Clientes" ON public.clientes FOR ALL USING (EXISTS (SELECT 1 FROM public.colaboradores WHERE user_id = auth.uid()));
CREATE POLICY "Colabs_Total_Projetos" ON public.projetos FOR ALL USING (EXISTS (SELECT 1 FROM public.colaboradores WHERE user_id = auth.uid()));
CREATE POLICY "Colabs_Total_Parcelas" ON public.projeto_parcelas FOR ALL USING (EXISTS (SELECT 1 FROM public.colaboradores WHERE user_id = auth.uid()));
CREATE POLICY "Colabs_Total_Contratos" ON public.contratos_gerados FOR ALL USING (EXISTS (SELECT 1 FROM public.colaboradores WHERE user_id = auth.uid()));
CREATE POLICY "Colabs_Total_Etapas" ON public.projeto_etapas FOR ALL USING (EXISTS (SELECT 1 FROM public.colaboradores WHERE user_id = auth.uid()));
CREATE POLICY "Colabs_Total_TiposProj" ON public.projeto_tipos FOR ALL USING (EXISTS (SELECT 1 FROM public.colaboradores WHERE user_id = auth.uid()));
CREATE POLICY "Colabs_Total_TipoEtapas" ON public.projeto_tipo_etapas FOR ALL USING (EXISTS (SELECT 1 FROM public.colaboradores WHERE user_id = auth.uid()));

-- 3. Políticas de Acesso Anônimo (Fallback antigo)
CREATE POLICY "Anonimo_Clientes" ON public.clientes FOR ALL USING (auth.uid() IS NULL);
CREATE POLICY "Anonimo_Projetos" ON public.projetos FOR ALL USING (auth.uid() IS NULL);
CREATE POLICY "Anonimo_Parcelas" ON public.projeto_parcelas FOR ALL USING (auth.uid() IS NULL);
CREATE POLICY "Anonimo_Contratos" ON public.contratos_gerados FOR ALL USING (auth.uid() IS NULL);
CREATE POLICY "Anonimo_Etapas" ON public.projeto_etapas FOR ALL USING (auth.uid() IS NULL);
CREATE POLICY "Anonimo_Tipos" ON public.projeto_tipos FOR ALL USING (auth.uid() IS NULL);
CREATE POLICY "Anonimo_TipoEtapas" ON public.projeto_tipo_etapas FOR ALL USING (auth.uid() IS NULL);


-- ATUALIZAÇÃO: migration.sql
-- ==========================================
-- 1. ALTERAÇÃO NA TABELA CLIENTES
-- ==========================================
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id);

-- ==========================================
-- 2. HABILITAR RLS NAS TABELAS
-- ==========================================
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projetos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projeto_parcelas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contratos_gerados ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 3. POLÍTICAS PARA CLIENTES (SUPABASE AUTH)
-- ==========================================

-- Clientes só veem seus próprios dados na tabela clientes
CREATE POLICY "Clientes acessam apenas seus próprios dados" ON public.clientes
    FOR SELECT USING (auth.uid() = auth_user_id);

-- Clientes só veem projetos vinculados ao seu registro de cliente
CREATE POLICY "Clientes acessam apenas seus próprios projetos" ON public.projetos
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.clientes 
            WHERE id = projetos.cliente_id AND auth_user_id = auth.uid()
        )
    );

-- Clientes só veem parcelas dos seus projetos
CREATE POLICY "Clientes acessam apenas suas próprias parcelas" ON public.projeto_parcelas
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.projetos p
            JOIN public.clientes c ON p.cliente_id = c.id
            WHERE p.id = projeto_parcelas.projeto_id AND c.auth_user_id = auth.uid()
        )
    );

-- Clientes só veem contratos gerados para seus projetos
CREATE POLICY "Clientes acessam apenas seus próprios contratos" ON public.contratos_gerados
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.projetos p
            JOIN public.clientes c ON p.cliente_id = c.id
            WHERE p.id = contratos_gerados.projeto_id AND c.auth_user_id = auth.uid()
        )
    );

-- ==========================================
-- 4. POLÍTICAS PARA ADMIN/COLABORADORES (LEGADO)
-- ==========================================

-- Como o sistema atual não usa Supabase Auth para admin/colaboradores,
-- permitimos acesso total se NÃO houver usuário autenticado no Supabase Auth.
CREATE POLICY "Admin/Colaboradores Acesso Clientes" ON public.clientes FOR ALL USING (auth.uid() IS NULL);
CREATE POLICY "Admin/Colaboradores Acesso Projetos" ON public.projetos FOR ALL USING (auth.uid() IS NULL);
CREATE POLICY "Admin/Colaboradores Acesso Parcelas" ON public.projeto_parcelas FOR ALL USING (auth.uid() IS NULL);
CREATE POLICY "Admin/Colaboradores Acesso Contratos" ON public.contratos_gerados FOR ALL USING (auth.uid() IS NULL);


-- ATUALIZAÇÃO: refactor_contracts.sql
-- 1. Garantir que a coluna se chama data_geracao e tem valor default
-- Se created_at foi criada no passo anterior, vamos renomeá-la ou garantir data_geracao
DO $$ 
BEGIN 
    -- Se created_at existe (criada por erro meu antes), renomeia para data_geracao se esta não existir
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='contratos_gerados' AND column_name='created_at') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='contratos_gerados' AND column_name='data_geracao') THEN
        ALTER TABLE public.contratos_gerados RENAME COLUMN created_at TO data_geracao;
    END IF;

    -- Se data_geracao ainda não existe, cria
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='contratos_gerados' AND column_name='data_geracao') THEN
        ALTER TABLE public.contratos_gerados ADD COLUMN data_geracao TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- 2. Limpar duplicatas na tabela contratos_gerados antes de adicionar a restrição UNIQUE
DELETE FROM contratos_gerados
WHERE id IN (
    SELECT id
    FROM (
        SELECT id,
               ROW_NUMBER() OVER (PARTITION BY projeto_id ORDER BY data_geracao DESC, id DESC) as rn
        FROM contratos_gerados
    ) t
    WHERE t.rn > 1
);

-- 3. Adicionar restrição UNIQUE na coluna projeto_id
ALTER TABLE contratos_gerados DROP CONSTRAINT IF EXISTS contratos_gerados_projeto_id_key;
ALTER TABLE contratos_gerados ADD CONSTRAINT contratos_gerados_projeto_id_key UNIQUE (projeto_id);


