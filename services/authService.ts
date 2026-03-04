import { supabase } from './supabaseClient';
import { User, UserRole } from './interfaces/types';

/**
 * Login com autenticação via Supabase
 * Admin e colaboradores são buscados da tabela colaboradores
 */
export const login = async (email: string, pass: string): Promise<User> => {
    // 1. Autenticar no Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email,
        password: pass
    });

    if (authError) {
        throw new Error('Credenciais inválidas: ' + authError.message);
    }

    if (!authData.user) {
        throw new Error('Erro ao obter dados do usuário');
    }

    // 2. Buscar dados complementares na tabela colaboradores pelo user_id
    const { data: colaborador, error: colabError } = await supabase
        .from('colaboradores')
        .select('*')
        .eq('user_id', authData.user.id)
        .single();

    if (colabError || !colaborador) {
        // Se não encontrar na tabela colaboradores, pode ser um cliente (tratado em outro lugar ou aqui)
        // Por ora, vamos manter a lógica de colaboradores aqui
        throw new Error('Colaborador não vinculado ao sistema');
    }

    // Determinar role baseado no campo perfil
    const role = colaborador.perfil === 'admin' ? UserRole.ADMIN : UserRole.COLABORADOR;

    const user: User = {
        id: colaborador.id,
        name: colaborador.nome,
        role: role,
        email: colaborador.email,
        empresaId: colaborador.empresa_id,
        token: authData.session?.access_token || colaborador.id
    };

    localStorage.setItem('app_session', JSON.stringify(user));
    return user;
};

/**
 * Logout do usuário
 */
export const logout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('app_session');
};

/**
 * Retorna o usuário logado da sessão local
 */
export const getCurrentUser = (): User | null => {
    const session = localStorage.getItem('app_session');
    return session ? JSON.parse(session) : null;
};
