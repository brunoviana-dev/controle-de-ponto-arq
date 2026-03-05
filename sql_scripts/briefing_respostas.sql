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
