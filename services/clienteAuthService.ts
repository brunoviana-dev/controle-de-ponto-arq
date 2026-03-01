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
