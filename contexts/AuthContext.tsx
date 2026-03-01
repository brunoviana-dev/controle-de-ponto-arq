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
            if (session?.user) {
                // Se temos uma sessão do Supabase, verificar se é um cliente
                // (Opcionalmente podemos buscar os dados do cliente aqui)
                const clientUser: User = {
                    id: session.user.id,
                    name: session.user.user_metadata?.full_name || session.user.email || 'Cliente',
                    login: session.user.email || '',
                    role: UserRole.CLIENTE,
                    email: session.user.email
                };
                setUser(clientUser);
                localStorage.setItem('app_session_client', JSON.stringify(clientUser));
            } else if (event === 'SIGNED_OUT') {
                // Apenas limpar se não houver um colaborador logado
                if (!localStorage.getItem('app_session')) {
                    setUser(null);
                }
                localStorage.removeItem('app_session_client');
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
