import { supabase } from './supabaseClient';

/**
 * Login para clientes via Supabase Auth
 */
export const loginCliente = async (email: string, pass: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: pass,
    });

    if (error) {
        throw new Error(`Erro ao entrar: ${error.message}`);
    }

    if (!data.user) {
        throw new Error('Erro ao obter dados do usuário');
    }

    // Verificar se existe perfil de cliente vinculado a este auth_user_id
    const { data: cliente, error: clientError } = await supabase
        .from('clientes')
        .select('id')
        .eq('auth_user_id', data.user.id)
        .single();

    if (clientError || !cliente) {
        const isNotFoundError = clientError?.code === 'PGRST116' ||
            clientError?.message?.includes('single JSON object');

        if (isNotFoundError || !cliente) {
            await supabase.auth.signOut();
            throw new Error('Cliente não Encontrado');
        }
        throw new Error('Erro ao verificar perfil do cliente: ' + (clientError?.message || 'Erro desconhecido'));
    }

    return data.user;
};

/**
 * Logout do cliente (Supabase Auth)
 */
export const logoutCliente = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
        throw new Error(`Erro ao sair: ${error.message}`);
    }
    localStorage.removeItem('app_session_client');
};
