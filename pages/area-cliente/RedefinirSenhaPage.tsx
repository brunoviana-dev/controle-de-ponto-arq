import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';

const RedefinirSenhaPage: React.FC = () => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>({
        type: 'info',
        text: 'Validando link de acesso...'
    });
    const navigate = useNavigate();
    const isMounted = useRef(false);

    useEffect(() => {
        isMounted.current = true;
        let subscription: any = null;

        const checkSession = async () => {
            try {
                // Pequeno delay para evitar conflitos de renderização dupla do React Strict Mode
                await new Promise(resolve => setTimeout(resolve, 500));

                if (!isMounted.current) return;

                // 1. Verificar se já existe uma sessão ativa
                const { data: { session: currentSession } } = await supabase.auth.getSession();
                if (currentSession) {
                    console.log('Sessão ativa encontrada');
                    setMessage(null);
                    return;
                }

                // 2. Tentar capturar tokens da URL
                const hash = window.location.hash.substring(1);
                const search = window.location.search.substring(1);
                const params = new URLSearchParams(hash || search);

                const accessToken = params.get('access_token');
                const refreshToken = params.get('refresh_token');
                const errorDesc = params.get('error_description');

                if (errorDesc) {
                    setMessage({ type: 'error', text: 'Link inválido: ' + errorDesc.replace(/\+/g, ' ') });
                    return;
                }

                if (accessToken && refreshToken) {
                    const { error: sessionError } = await supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken
                    });

                    if (!sessionError) {
                        setMessage(null);
                        return;
                    } else if (sessionError.message.includes('aborted')) {
                        // Se foi abortado, espera um pouco e tenta o getSession de novo
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        const { data: { session: retrySession } } = await supabase.auth.getSession();
                        if (retrySession) {
                            setMessage(null);
                            return;
                        }
                    }
                }

                // 3. Monitorar mudanças de estado
                const { data } = supabase.auth.onAuthStateChange((event, session) => {
                    if (session && isMounted.current) {
                        setMessage(null);
                    }
                });
                subscription = data.subscription;

                // 4. Timeout final - se tivermos tokens na URL mas o Supabase não "confirmou", 
                // liberamos o formulário mesmo assim para a tentativa de update
                setTimeout(async () => {
                    if (isMounted.current) {
                        const { data: { session: finalSession } } = await supabase.auth.getSession();
                        if (finalSession || accessToken) {
                            setMessage(null);
                        } else {
                            setMessage({
                                type: 'error',
                                text: 'Não foi possível validar seu acesso automático. Tente digitar a nova senha ou solicite um novo link.'
                            });
                        }
                    }
                }, 3000);

            } catch (err: any) {
                // Ignorar erros de "abort" que são apenas ruído de rede do React
                if (!err.message?.includes('aborted')) {
                    setMessage({ type: 'error', text: 'Erro ao validar: ' + (err.message || 'Tente recarregar') });
                }
            }
        };

        checkSession();

        return () => {
            isMounted.current = false;
            if (subscription) subscription.unsubscribe();
        };
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setMessage({ type: 'error', text: 'As senhas não coincidem.' });
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({ password });
            if (error) throw error;

            setMessage({ type: 'success', text: 'Senha alterada com sucesso! Redirecionando...' });
            setTimeout(() => navigate('/area-cliente/login'), 2000);
        } catch (err: any) {
            setMessage({ type: 'error', text: 'Erro ao atualizar: ' + (err.message || 'Tente novamente') });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-surface p-8 rounded-xl border border-slate-700 shadow-2xl">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">Nova Senha</h1>
                    <p className="text-slate-400">Crie sua nova senha de acesso</p>
                </div>

                {message && (
                    <div className={`mb-6 p-4 rounded-lg text-sm text-center border ${message.type === 'success'
                        ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400'
                        : message.type === 'info'
                            ? 'bg-blue-500/10 border-blue-500/50 text-blue-400'
                            : 'bg-red-500/10 border-red-500/50 text-red-500'
                        }`}>
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <input
                        type="password"
                        required
                        placeholder="Nova Senha"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white"
                    />
                    <input
                        type="password"
                        required
                        placeholder="Confirmar Senha"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white"
                    />
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-primary hover:bg-primary-dark text-white font-bold rounded-lg disabled:opacity-50"
                    >
                        {loading ? 'Atualizando...' : 'Definir Nova Senha'}
                    </button>
                    {message?.type === 'error' && (
                        <button type="button" onClick={() => navigate('/area-cliente/esqueci-senha')} className="w-full text-center text-sm text-primary hover:underline mt-4">
                            Solicitar novo link
                        </button>
                    )}
                </form>
            </div>
        </div>
    );
};

export default RedefinirSenhaPage;
