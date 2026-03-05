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
