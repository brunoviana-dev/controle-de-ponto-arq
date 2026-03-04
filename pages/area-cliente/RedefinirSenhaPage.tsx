import React, { useState, useEffect } from 'react';
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

    useEffect(() => {
        let subscription: any = null;
        let timer: any = null;

        const checkSession = async () => {
            // 1. Tentar capturar o token manualmente da URL
            const fullHash = window.location.hash; // #access_token=...
            if (fullHash.includes('access_token=')) {
                console.log('Token detectado na URL');
                setMessage({ type: 'info', text: 'Validando link de acesso...' });

                // Extrair os parâmetros da parte que vem após o segundo # ou do que parece ser query
                const hashParts = fullHash.split('#');
                const tokenPart = hashParts.find(p => p.includes('access_token='));

                if (tokenPart) {
                    const params = new URLSearchParams(tokenPart.startsWith('?') ? tokenPart : '?' + tokenPart);
                    const accessToken = params.get('access_token');
                    const refreshToken = params.get('refresh_token');

                    if (accessToken && refreshToken) {
                        try {
                            const { error } = await supabase.auth.setSession({
                                access_token: accessToken,
                                refresh_token: refreshToken
                            });
                            if (!error) {
                                console.log('Sessão definida manualmente com sucesso');
                                setMessage(null);
                                return;
                            }
                        } catch (e) {
                            console.error('Erro ao definir sessão manual:', e);
                        }
                    }
                }
            }

            // 2. Tentar pegar sessão já processada automaticamente
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                setMessage(null);
                return;
            }

            // 3. Monitorar mudanças de estado
            const { data } = supabase.auth.onAuthStateChange((event, session) => {
                if (session || event === 'PASSWORD_RECOVERY') {
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
                        text: 'Link de redefinição inválido ou expirado. Por favor, solicite um novo link.'
                    });
                } else {
                    setMessage(null);
                }
            }, 8000); // 8 segundos para garantir
        };

        checkSession();

        return () => {
            if (subscription) subscription.unsubscribe();
            if (timer) clearTimeout(timer);
        };
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            setMessage({ type: 'error', text: 'As senhas não coincidem.' });
            return;
        }

        if (password.length < 6) {
            setMessage({ type: 'error', text: 'A senha deve ter pelo menos 6 caracteres.' });
            return;
        }

        setLoading(true);
        setMessage(null);

        try {
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

                    {message?.type === 'error' && message.text.includes('expirado') && (
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
