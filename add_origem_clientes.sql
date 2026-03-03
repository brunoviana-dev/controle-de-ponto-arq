-- Adicionar coluna origem à tabela clientes para rastrear fonte (ex: briefing)
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS origem TEXT DEFAULT 'direto';
