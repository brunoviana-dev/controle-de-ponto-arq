import { supabase } from './supabaseClient';

/**
 * Login para clientes via Supabase Auth
 */
export const loginCliente = async (email: string, pass: string) => {
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
            body: JSON.stringify({ email, password: pass })
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

        // 2. Verificar perfil de cliente via API REST direta
        const clienteUrl = `${supabaseUrl}/rest/v1/clientes?auth_user_id=eq.${authUser.id}&select=id,nome,empresa_id`;
        const clienteResponse = await fetch(clienteUrl, {
            headers: {
                'apikey': supabaseAnonKey,
                'Authorization': `Bearer ${authSession.access_token}`,
                'Accept': 'application/vnd.pgrst.object+json'
            }
        });

        if (!clienteResponse.ok) {
            throw new Error('Erro ao verificar perfil do cliente');
        }

        const cliente = await clienteResponse.json();

        if (!cliente) {
            throw new Error('Cliente não Encontrado');
        }

        // 3. Montar objeto para o localStorage (fundamental para manter logado no F5)
        const clientUser = {
            id: authUser.id,
            name: cliente.nome || authUser.email.split('@')[0],
            role: 'CLIENTE',
            email: authUser.email,
            empresaId: cliente.empresa_id || '', // IMPORTANTE: Pegar a empresa do cliente
            userId: authUser.id,
            accessToken: authSession.access_token
        };

        localStorage.setItem('app_session_client', JSON.stringify(clientUser));

        // 4. Definir a sessão no SDK
        supabase.auth.setSession(authSession).catch(err => {
            console.error('Erro ao definir sessão de cliente:', err.message);
        });

        return clientUser;
    } catch (err: any) {
        throw err;
    }
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
