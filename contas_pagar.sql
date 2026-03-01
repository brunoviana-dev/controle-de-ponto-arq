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
