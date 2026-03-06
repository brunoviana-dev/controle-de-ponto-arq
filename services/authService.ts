import { supabase } from './supabaseClient';
import { User, UserRole } from './interfaces/types';

// Chave para persistência local (somente admin/colab)
const SESSION_KEY = 'app_session';

export const login = async (email: string, password: string): Promise<User> => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    try {
        // 1. Chamar a Edge Function segura via FETCH nativo
        const response = await fetch(`${supabaseUrl}/functions/v1/login-auth-security`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseAnonKey}`,
                'apikey': supabaseAnonKey
            },
            body: JSON.stringify({ email, password })
        });

        if (!response.ok) {
            let errorMessage = 'Erro ao processar login.';
            try {
                const errorBody = await response.json();
                if (errorBody && errorBody.error) errorMessage = errorBody.error;
            } catch (e) { }
            throw new Error(errorMessage);
        }

        const edgeData = await response.json();

        if (!edgeData || !edgeData.session) {
            throw new Error(edgeData?.error || 'Erro ao receber dados de autenticação.');
        }

        const { user: authUser, session: authSession } = edgeData;

        // 2. Buscar dados complementares via API REST direta para evitar deadlocks no SDK
        const colabUrl = `${supabaseUrl}/rest/v1/colaboradores?user_id=eq.${authUser.id}&select=*`;
        const colabResponse = await fetch(colabUrl, {
            headers: {
                'apikey': supabaseAnonKey,
                'Authorization': `Bearer ${authSession.access_token}`,
                'Accept': 'application/vnd.pgrst.object+json'
            }
        });

        if (!colabResponse.ok) {
            throw new Error('Erro ao buscar perfil do colaborador');
        }

        const colaborador = await colabResponse.json();

        if (!colaborador) {
            throw new Error('Colaborador não Encontrado');
        }

        const role = colaborador.perfil === 'admin' ? UserRole.ADMIN : UserRole.COLABORADOR;

        const user: User = {
            id: colaborador.id,
            name: colaborador.nome,
            role,
            email: colaborador.email,
            empresaId: colaborador.empresa_id,
            userId: authUser.id,
            accessToken: authSession.access_token
        };

        // 3. Salvar no localStorage primeiro (fundamental para o redirecionamento imediato)
        localStorage.setItem(SESSION_KEY, JSON.stringify(user));

        // 4. Definir a sessão no cliente do Supabase de forma ASSÍNCRONA
        supabase.auth.setSession(authSession).catch(err => {
            console.error('Erro ao definir sessão em segundo plano:', err.message);
        });

        return user;
    } catch (err: any) {
        throw err;
    }
};

export const logout = () => {
    supabase.auth.signOut();
    localStorage.removeItem(SESSION_KEY);
};

export const getCurrentUser = (): User | null => {
    const session = localStorage.getItem(SESSION_KEY);
    return session ? JSON.parse(session) : null;
};

export const changePassword = async (oldPassword: string, newPassword: string): Promise<void> => {
    // 1. Obter o usuário logado para pegar o email
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user || !user.email) {
        throw new Error('Usuário não autenticado ou e-mail não encontrado.');
    }

    // 2. Verificar a senha atual tentando um re-login silencioso
    const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: oldPassword
    });

    if (signInError) {
        throw new Error('Senha atual incorreta.');
    }

    // 3. Atualizar para a nova senha
    const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
    });

    if (updateError) {
        throw new Error(updateError.message);
    }
};
