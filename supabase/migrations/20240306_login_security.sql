-- Tabela para controle de tentativas de login e bloqueio de força bruta
CREATE TABLE IF NOT EXISTS public.login_tentativas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tentativas INTEGER DEFAULT 0,
    bloqueado_ate TIMESTAMP WITH TIME ZONE,
    ultima_tentativa TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_user_tentativas UNIQUE (user_id)
);

-- Habilitar RLS (Segurança de Nível de Linha) - Embora esta tabela seja editada via Edge Function/Admin
ALTER TABLE public.login_tentativas ENABLE ROW LEVEL SECURITY;

-- Índice para busca rápida por user_id
CREATE INDEX IF NOT EXISTS idx_login_tentativas_user_id ON public.login_tentativas(user_id);

-- Função para atualizar o timestamp de updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para updated_at
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.login_tentativas
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Comentários da tabela
COMMENT ON TABLE public.login_tentativas IS 'Controle de segurança contra ataques de força bruta no login.';
