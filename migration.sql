-- ==========================================
-- 1. ALTERAÇÃO NA TABELA CLIENTES
-- ==========================================
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id);

-- ==========================================
-- 2. HABILITAR RLS NAS TABELAS
-- ==========================================
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projetos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projeto_parcelas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contratos_gerados ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 3. POLÍTICAS PARA CLIENTES (SUPABASE AUTH)
-- ==========================================

-- Clientes só veem seus próprios dados na tabela clientes
CREATE POLICY "Clientes acessam apenas seus próprios dados" ON public.clientes
    FOR SELECT USING (auth.uid() = auth_user_id);

-- Clientes só veem projetos vinculados ao seu registro de cliente
CREATE POLICY "Clientes acessam apenas seus próprios projetos" ON public.projetos
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.clientes 
            WHERE id = projetos.cliente_id AND auth_user_id = auth.uid()
        )
    );

-- Clientes só veem parcelas dos seus projetos
CREATE POLICY "Clientes acessam apenas suas próprias parcelas" ON public.projeto_parcelas
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.projetos p
            JOIN public.clientes c ON p.cliente_id = c.id
            WHERE p.id = projeto_parcelas.projeto_id AND c.auth_user_id = auth.uid()
        )
    );

-- Clientes só veem contratos gerados para seus projetos
CREATE POLICY "Clientes acessam apenas seus próprios contratos" ON public.contratos_gerados
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.projetos p
            JOIN public.clientes c ON p.cliente_id = c.id
            WHERE p.id = contratos_gerados.projeto_id AND c.auth_user_id = auth.uid()
        )
    );

-- ==========================================
-- 4. POLÍTICAS PARA ADMIN/COLABORADORES (LEGADO)
-- ==========================================

-- Como o sistema atual não usa Supabase Auth para admin/colaboradores,
-- permitimos acesso total se NÃO houver usuário autenticado no Supabase Auth.
CREATE POLICY "Admin/Colaboradores Acesso Clientes" ON public.clientes FOR ALL USING (auth.uid() IS NULL);
CREATE POLICY "Admin/Colaboradores Acesso Projetos" ON public.projetos FOR ALL USING (auth.uid() IS NULL);
CREATE POLICY "Admin/Colaboradores Acesso Parcelas" ON public.projeto_parcelas FOR ALL USING (auth.uid() IS NULL);
CREATE POLICY "Admin/Colaboradores Acesso Contratos" ON public.contratos_gerados FOR ALL USING (auth.uid() IS NULL);
