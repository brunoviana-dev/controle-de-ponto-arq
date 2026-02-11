import { supabase } from './supabaseClient';
import { User, UserRole } from './interfaces/types';

/**
 * Login com autenticação via Supabase
 * Admin e colaboradores são buscados da tabela colaboradores
 */
export const login = async (login: string, pass: string): Promise<User> => {
    // Buscar usuário (admin ou colaborador) no banco
    const { data: colaborador, error } = await supabase
        .from('colaboradores')
        .select('*')
        .eq('login', login)
        .eq('senha_hash', pass) // Em produção, usar bcrypt
        .single();

    if (error || !colaborador) {
        throw new Error('Credenciais inválidas');
    }

    // Determinar role: admin se login for 'admin', caso contrário colaborador
    const role = colaborador.login === 'admin' ? UserRole.ADMIN : UserRole.COLABORADOR;

    const user: User = {
        id: colaborador.id,
        name: colaborador.nome,
        login: colaborador.login,
        email: colaborador.email,
        role: role,
        token: colaborador.id
    };

    localStorage.setItem('app_session', JSON.stringify(user));
    return user;
};

/**
 * Logout do usuário
 */
export const logout = () => {
    localStorage.removeItem('app_session');
};

/**
 * Retorna o usuário logado da sessão local
 */
export const getCurrentUser = (): User | null => {
    const session = localStorage.getItem('app_session');
    return session ? JSON.parse(session) : null;
};
