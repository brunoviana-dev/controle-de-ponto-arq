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
