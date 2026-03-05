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
