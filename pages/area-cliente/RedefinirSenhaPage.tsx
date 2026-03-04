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
    const hasCheckedSession = useRef(false);

    useEffect(() => {
        if (hasCheckedSession.current) return;
        hasCheckedSession.current = true;

        let subscription: any = null;
        let timer: any = null;

        const checkSession = async () => {
            try {
                // 1. Tentar pegar sessão já processada automaticamente
                const { data: { session: initialSession } } = await supabase.auth.getSession();
                if (initialSession) {
                    console.log('Sessão inicial detectada');
                    setMessage(null);
                    return;
                }

                // 2. Extrair parâmetros da URL (tanto hash quanto search)
                const hash = window.location.hash.substring(1);
                const search = window.location.search.substring(1);
                const params = new URLSearchParams(hash || search);

                const accessToken = params.get('access_token');
                const refreshToken = params.get('refresh_token');
                const errorDesc = params.get('error_description');

                if (errorDesc) {
                    setMessage({ type: 'error', text: errorDesc.replace(/\+/g, ' ') });
                    return;
                }

                if (accessToken && refreshToken) {
                    console.log('Tokens encontrados na URL, tentando definir sessão...');
                    const { error } = await supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken
                    });

                    if (!error) {
                        console.log('Sessão definida com sucesso via URL');
                        setMessage(null);
                        return;
                    } else {
                        console.error('Erro ao definir sessão via URL:', error);
                    }
                }

                // 3. Monitorar mudanças de estado
                const { data } = supabase.auth.onAuthStateChange((event, session) => {
                    console.log('Evento de autenticação:', event);
                    if (session || event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY') {
                        setMessage(null);
                    }
                });
                subscription = data.subscription;

                // 4. Timeout de segurança
                timer = setTimeout(async () => {
                    const { data: { session: finalSession } } = await supabase.auth.getSession();
                    if (!finalSession) {
                        setMessage({
                            type: 'error',
                            text: 'O link de acesso não pôde ser validado. Por favor, tente recarregar a página ou solicite um novo link.'
                        });
                    } else {
                        setMessage(null);
                    }
                }, 5000);
            } catch (err) {
                console.error('Erro ao validar sessão:', err);
                setMessage({ type: 'error', text: 'Ocorreu um erro ao validar seu acesso.' });
            }
        };

        checkSession();

        return () => {
            if (subscription) subscription.unsubscribe();
            if (timer) clearTimeout(timer);
        };
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);

        if (password !== confirmPassword) {
            setMessage({ type: 'error', text: 'As senhas não coincidem.' });
            return;
        }

        if (password.length < 6) {
            setMessage({ type: 'error', text: 'A senha deve ter pelo menos 6 caracteres.' });
            return;
        }

        setLoading(true);

        try {
            // Garantir que temos uma sessão ativa antes de tentar o update
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                throw new Error('Sessão expirada ou inválida. Por favor, peça um novo link.');
            }

            const { error } = await supabase.auth.updateUser({
                password: password
            });

            if (error) throw error;

            setMessage({
                type: 'success',
                text: 'Senha alterada com sucesso! Redirecionando para o login...'
            });

            setTimeout(() => {
                navigate('/area-cliente/login');
            }, 3000);
        } catch (err: any) {
            console.error('Erro ao salvar nova senha:', err);
            setMessage({
                type: 'error',
                text: 'Erro ao atualizar senha: ' + (err.message || 'Erro desconhecido')
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-surface p-8 rounded-xl border border-slate-700 shadow-2xl">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">Nova Senha</h1>
                    <p className="text-slate-400">Escolha sua nova senha de acesso</p>
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
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Nova Senha</label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                            placeholder="••••••••"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Confirmar Senha</label>
                        <input
                            type="password"
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                            placeholder="••••••••"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading || (message?.type === 'error' && message.text.includes('expirado'))}
                        className="w-full py-3 bg-primary hover:bg-primary-dark text-white font-bold rounded-lg transition-colors shadow-lg shadow-primary/20 disabled:opacity-50"
                    >
                        {loading ? 'Atualizando...' : 'Definir Nova Senha'}
                    </button>

                    {message?.type === 'error' && (message.text.includes('expirado') || message.text.includes('pôde ser validado')) && (
                        <div className="text-center mt-4">
                            <button
                                type="button"
                                onClick={() => navigate('/area-cliente/esqueci-senha')}
                                className="text-sm text-primary hover:underline transition-colors"
                            >
                                Solicitar novo link
                            </button>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
};

export default RedefinirSenhaPage;
