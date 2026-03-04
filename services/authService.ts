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

    // Verificar se existe perfil de cliente vinculado a este auth_user_id
    const { data: cliente, error: clientError } = await supabase
        .from('clientes')
        .select('id')
        .eq('auth_user_id', authData.user.id) // Corrected from 'data.user.id' to 'authData.user.id'
        .single();

    if (cliente) { // If a client profile is found, this user is not a collaborator
        await supabase.auth.signOut(); // Log out the user as they are not a collaborator for this login flow
        throw new Error('Este usuário é um cliente e não pode acessar esta área.');
    }

    // If clientError indicates no row found, it's expected, proceed to check collaborators
    const isNotFoundError = clientError?.code === 'PGRST116' ||
        clientError?.message?.includes('single JSON object');

    if (clientError && !isNotFoundError) { // If there's an actual error other than "not found"
        throw new Error('Erro ao verificar perfil do cliente: ' + (clientError?.message || 'Erro desconhecido'));
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

    if (colabError || !colaborador) {
        // Se der erro de "single row" ou não vier dado, provavelmente não é colaborador
        const isNotFoundError = colabError?.code === 'PGRST116' ||
            colabError?.message?.includes('single JSON object');

        if (isNotFoundError || !colaborador) {
            // Antes de jogar erro, vamos deslogar do Auth se for login forçado por aqui
            // Mas o Login.tsx trata isso. O Importante é a mensagem.
            throw new Error('Colaborador não Encontrado');
        }
        throw new Error('Erro ao buscar perfil do colaborador: ' + (colabError?.message || 'Erro desconhecido'));
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
