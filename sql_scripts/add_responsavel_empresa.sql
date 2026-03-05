-- Adiciona colunas responsavel_tecnico e registro_profissional na tabela empresas
ALTER TABLE public.empresas
ADD COLUMN IF NOT EXISTS responsavel_tecnico TEXT,
ADD COLUMN IF NOT EXISTS registro_profissional TEXT;
