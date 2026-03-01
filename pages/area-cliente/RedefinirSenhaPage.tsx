import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';

const RedefinirSenhaPage: React.FC = () => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        // Verificar se há uma sessão ativa (vinda do link do e-mail)
        const checkSession = async () => {
            // Dar um tempo curto para o Supabase processar os tokens da URL
            const { data: { session } } = await supabase.auth.getSession();

            if (session) {
                console.log('Sessão de redefinição detectada');
                return;
            }

            // Se não houver sessão imediata, escutar mudanças (pode demorar alguns milissegundos)
            const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
                if (event === 'PASSWORD_RECOVERY' || session) {
                    setMessage(null);
                } else if (!session) {
                    setMessage({
                        type: 'error',
                        text: 'Link de redefinição inválido ou expirado. Por favor, solicite um novo link.'
                    });
                }
            });

            // Timeout de segurança se nada acontecer
            setTimeout(async () => {
                const { data: { session: finalSession } } = await supabase.auth.getSession();
                if (!finalSession) {
                    setMessage({
                        type: 'error',
                        text: 'Link de redefinição inválido ou expirado. Por favor, solicite um novo link.'
                    });
                }
                subscription.unsubscribe();
            }, 2000);
        };

        checkSession();
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
