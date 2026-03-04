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
    const [user, setUser] = useState<User | null>(() => {
        const adminSession = localStorage.getItem('app_session');
        if (adminSession) return JSON.parse(adminSession);
        const clientSession = localStorage.getItem('app_session_client');
        if (clientSession) return JSON.parse(clientSession);
        return null;
    });

    React.useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (session?.user) {
                // Se já temos um user de admin no localStorage vindo do login explícito, 
                // priorize ele (para manter compatibilidade com o login de admin)
                const adminSessionStr = localStorage.getItem('app_session');
                if (adminSessionStr) {
                    const adminUser = JSON.parse(adminSessionStr);
                    if (adminUser.userId === session.user.id) {
                        setUser(adminUser);
                        return;
                    }
                }

                // Senão, buscar no banco para ver quem é esse usuário (Colaborador ou Cliente)
                try {
                    // 1. Tentar Colaborador
                    const { data: colab, error: errColab } = await supabase
                        .from('colaboradores')
                        .select('*')
                        .eq('user_id', session.user.id)
                        .single();

                    if (colab && !errColab) {
                        const staffUser: User = {
                            id: colab.id,
                            name: colab.nome,
                            role: colab.perfil === 'admin' ? UserRole.ADMIN : UserRole.COLABORADOR,
                            email: colab.email,
                            empresaId: colab.empresa_id,
                            userId: session.user.id
                        };
                        setUser(staffUser);
                        localStorage.setItem('app_session', JSON.stringify(staffUser));
                        localStorage.removeItem('app_session_client');
                        return;
                    }

                    // 2. Tentar Cliente
                    const { data: cliente, error: errCliente } = await supabase
                        .from('clientes')
                        .select('*')
                        .eq('auth_user_id', session.user.id)
                        .single();

                    if (cliente && !errCliente) {
                        const clientUser: User = {
                            id: session.user.id,
                            name: cliente.nome || session.user.email || 'Cliente',
                            role: UserRole.CLIENTE,
                            email: session.user.email || '',
                            empresaId: cliente.empresa_id || ''
                        };
                        setUser(clientUser);
                        localStorage.setItem('app_session_client', JSON.stringify(clientUser));
                        localStorage.removeItem('app_session');
                        return;
                    }
                } catch (e) {
                    console.error('Error resolving user profile:', e);
                }
            } else if (event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
                localStorage.removeItem('app_session');
                localStorage.removeItem('app_session_client');
                setUser(null);
            }
        });

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
