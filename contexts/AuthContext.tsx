import React, { createContext, useContext, useState } from 'react';
import { User, UserRole } from '../services/interfaces/types';
import { getCurrentUser, logout } from '../services/authService';
import { supabase } from '../services/supabaseClient';

interface AuthContextType {
    user: User | null;
    refreshUser: () => void;
    signOut: () => void;
}

const AuthContext = createContext<AuthContextType>(null!);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(getCurrentUser());

    React.useEffect(() => {
        // Escutar mudanças de autenticação do Supabase (para clientes)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            // Se há um admin/colaborador logado via localStorage, não interferir
            const adminSession = localStorage.getItem('app_session');
            if (adminSession) return;

            if (session?.user) {
                // Se temos uma sessão do Supabase e não há admin logado, é um cliente
                // Buscar dados do cliente no banco para pegar a empresa_id
                const { data: dbCliente } = await supabase
                    .from('clientes')
                    .select('empresa_id')
                    .eq('auth_user_id', session.user.id)
                    .single();

                const clientUser: User = {
                    id: session.user.id,
                    name: session.user.user_metadata?.full_name || session.user.email || 'Cliente',
                    role: UserRole.CLIENTE,
                    email: session.user.email || '',
                    empresaId: dbCliente?.empresa_id || ''
                };
                setUser(clientUser);
                localStorage.setItem('app_session_client', JSON.stringify(clientUser));
            } else if (event === 'SIGNED_OUT') {
                localStorage.removeItem('app_session_client');
                setUser(null);
            }
        });

        // Carregar sessão de cliente se existir e não houver admin/colab
        const clientSession = localStorage.getItem('app_session_client');
        if (clientSession && !user) {
            setUser(JSON.parse(clientSession));
        }

        return () => subscription.unsubscribe();
    }, []);

    const refreshUser = () => {
        const adminUser = getCurrentUser();
        if (adminUser) {
            setUser(adminUser);
        } else {
            const clientSession = localStorage.getItem('app_session_client');
            setUser(clientSession ? JSON.parse(clientSession) : null);
        }
    };

    const signOut = async () => {
        await supabase.auth.signOut();
        logout();
        localStorage.removeItem('app_session_client');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, refreshUser, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};
