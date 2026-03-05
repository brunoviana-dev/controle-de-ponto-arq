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
