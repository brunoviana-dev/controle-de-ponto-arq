import { getCurrentUser } from '../services/authService';
import { supabase } from '../services/supabaseClient';

export const EMPRESA_PADRAO_ID = 'd520b8bd-502d-49bb-ab87-3bf76a6e51a3';

export const getEmpresaAtualId = () => {
    // 1. Tentar pegar do admin/colaborador logado
    const user = getCurrentUser();
    if (user?.empresaId) return user.empresaId;

    // 2. Tentar pegar do cliente (localStorage separado no AuthContext)
    const clientSession = localStorage.getItem('app_session_client');
    if (clientSession) {
        const client = JSON.parse(clientSession);
        if (client.empresaId) return client.empresaId;
    }

    return EMPRESA_PADRAO_ID;
};
