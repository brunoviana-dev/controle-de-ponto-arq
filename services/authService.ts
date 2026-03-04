import { supabase } from './supabaseClient';
import { User, UserRole } from './interfaces/types';

// Chave para persistência local (somente admin/colab)
const SESSION_KEY = 'app_session';

export const login = async (email: string, password: string): Promise<User> => {
    // 1. Autenticar no Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (authError) {
        throw new Error(authError.message);
    }

    if (!authData.user) {
        throw new Error('Erro ao obter dados do usuário');
    }

    // 2. Buscar dados complementares na tabela colaboradores pelo user_id
    // Adicionamos um timeout para evitar travamentos em caso de problemas de rede/banco
    const colabPromise = supabase
        .from('colaboradores')
        .select('*')
        .eq('user_id', authData.user.id)
        .single();

    const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Tempo esgotado ao buscar perfil do colaborador')), 10000)
    );

    const { data: colaborador, error: colabError } = await Promise.race([colabPromise, timeoutPromise]) as any;

    if (colabError) {
        if (colabError.code === 'PGRST116') {
            throw new Error('Colaborador não Encontrado');
        }
        throw new Error('Erro ao buscar perfil do colaborador: ' + colabError.message);
    }

    if (!colaborador) {
        throw new Error('Colaborador não Encontrado');
    }

    // Determinar role baseado no campo perfil
    const role = colaborador.perfil === 'admin' ? UserRole.ADMIN : UserRole.COLABORADOR;

    const user: User = {
        id: colaborador.id,
        name: colaborador.nome,
        role,
        email: colaborador.email,
        empresaId: colaborador.empresa_id,
        userId: authData.user.id
    };

    // 3. Salvar sessão local (admin/colaborador)
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));

    return user;
};

export const logout = () => {
    supabase.auth.signOut();
    localStorage.removeItem(SESSION_KEY);
};

export const getCurrentUser = (): User | null => {
    const session = localStorage.getItem(SESSION_KEY);
    return session ? JSON.parse(session) : null;
};
