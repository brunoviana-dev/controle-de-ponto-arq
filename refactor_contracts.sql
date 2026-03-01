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
