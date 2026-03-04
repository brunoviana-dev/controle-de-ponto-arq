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
                console.log('Iniciando verificação de sessão...');

                // 1. Tentar capturar tokens da URL e forçar o login se existirem
                const hash = window.location.hash.substring(1);
                const search = window.location.search.substring(1);
                const params = new URLSearchParams(hash || search);

                const accessToken = params.get('access_token');
                const refreshToken = params.get('refresh_token');
                const errorDesc = params.get('error_description');

                if (errorDesc) {
                    setMessage({ type: 'error', text: 'Erro no link: ' + errorDesc.replace(/\+/g, ' ') });
                    return;
                }

                if (accessToken && refreshToken) {
                    console.log('Tokens encontrados na URL, tentando autenticar...');
                    const { error: sessionError } = await supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken
                    });

                    if (!sessionError) {
                        console.log('Sessão estabelecida via tokens da URL');
                        setMessage(null);
                        return;
                    } else {
                        console.warn('Erro ao usar tokens da URL:', sessionError.message);
                    }
                }

                // 2. Verificar se já existe uma sessão (as vezes o Supabase consome automático)
                const { data: { session }, error: getSessionError } = await supabase.auth.getSession();
                if (getSessionError) throw getSessionError;

                if (session) {
                    console.log('Sessão existente detectada');
                    setMessage(null);
                    return;
                }

                // 3. Monitorar mudanças de estado (ex: PASSWORD_RECOVERY)
                const { data } = supabase.auth.onAuthStateChange((event, session) => {
                    console.log('Evento de autenticação:', event);
                    if (session) {
                        setMessage(null);
                    }
                });
                subscription = data.subscription;

                // 4. Timeout de segurança - se em 4s não validar mas tivermos tokens, libera o form mesmo assim
                timer = setTimeout(async () => {
                    const { data: { session: finalSession } } = await supabase.auth.getSession();
                    if (!finalSession && !accessToken) {
                        setMessage({
                            type: 'error',
                            text: 'Link inválido ou expirado. Por favor, solicite um novo e-mail de recuperação.'
                        });
                    } else {
                        // Se temos tokens ou sessão, libera o formulário
                        setMessage(null);
                    }
                }, 4000);

            } catch (err: any) {
                console.error('Erro crítico na validação:', err);
                setMessage({
                    type: 'error',
                    text: 'Erro ao validar acesso: ' + (err.message || 'Tente recarregar a página.')
                });
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
            // Tenta atualizar a senha diretamente
            const { error } = await supabase.auth.updateUser({
                password: password
            });

            if (error) {
                // Se falhar por falta de sessão, tenta avisar o usuário
                if (error.message.includes('session') || error.status === 401) {
                    throw new Error('Sua sessão de redefinição expirou. Por favor, peça um novo link.');
                }
                throw error;
            }

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
                        disabled={loading || (message?.type === 'info')}
                        className="w-full py-3 bg-primary hover:bg-primary-dark text-white font-bold rounded-lg transition-colors shadow-lg shadow-primary/20 disabled:opacity-50"
                    >
                        {loading ? 'Atualizando...' : 'Definir Nova Senha'}
                    </button>

                    {message?.type === 'error' && (
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
