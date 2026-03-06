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
        // Inicializar a sessão no SDK a partir do localStorage de forma robusta
        const initSession = async () => {
            const adminSessionStr = localStorage.getItem('app_session');
            const clientSessionStr = localStorage.getItem('app_session_client');

            const sessionStr = adminSessionStr || clientSessionStr;

            if (sessionStr) {
                try {
                    const userData = JSON.parse(sessionStr);
                    if (userData.accessToken) {
                        // Define a sessão no SDK de forma silenciosa para habilitar os headers
                        supabase.auth.setSession({
                            access_token: userData.accessToken,
                            refresh_token: ''
                        }).catch(() => { });
                    }
                } catch (e) { }
            }
        };

        initSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'SIGNED_OUT') {
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
        try {
            // Força saída no supabase mas não deixa travar a UI se demorar
            const signOutPromise = supabase.auth.signOut();
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('timeout')), 2000)
            );
            await Promise.race([signOutPromise, timeoutPromise]);
        } catch (e) {
            console.warn('Supabase signOut demorou ou falhou, continuando limpeza local...');
        } finally {
            localStorage.removeItem('app_session');
            localStorage.removeItem('app_session_client');
            logout(); // Remove do localStorage via serviço legado se houver
            setUser(null);

            // Força recarregamento do estado da auth pra garantir limpeza de cache do client
            window.sessionStorage.clear();
        }
    };

    return (
        <AuthContext.Provider value={{ user, refreshUser, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};
