import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';

const RedefinirSenhaPage: React.FC = () => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const initSession = async () => {
            // Tenta pegar tokens da URL se existirem
            const hash = window.location.hash.substring(1);
            const search = window.location.search.substring(1);
            const params = new URLSearchParams(hash || search);

            const accessToken = params.get('access_token');
            const refreshToken = params.get('refresh_token');

            if (accessToken && refreshToken) {
                console.log('Tokens detectados, preparando sessão...');
                await supabase.auth.setSession({
                    access_token: accessToken,
                    refresh_token: refreshToken
                }).catch(console.error);
            }
        };

        initSession();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            setMessage({ type: 'error', text: 'As senhas não coincidem.' });
            return;
        }

        setLoading(true);
        setMessage({ type: 'info', text: 'Atualizando sua senha...' });

        try {
            // 1. Antes de atualizar, garante que temos uma sessão (essencial para o Supabase)
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                // Tentativa de recuperação manual se a sessão automática falhou
                const hash = window.location.hash.substring(1);
                const search = window.location.search.substring(1);
                const params = new URLSearchParams(hash || search);
                const accessToken = params.get('access_token');
                const refreshToken = params.get('refresh_token');

                if (accessToken && refreshToken) {
                    await supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken
                    });
                } else {
                    throw new Error('Link expirado ou inválido. Por favor, solicite um novo link por e-mail.');
                }
            }

            // 2. Atualiza a senha
            const { error } = await supabase.auth.updateUser({ password });

            if (error) throw error;

            setMessage({ type: 'success', text: 'Senha alterada com sucesso! Redirecionando...' });

            setTimeout(() => {
                navigate('/area-cliente/login');
            }, 2500);

        } catch (err: any) {
            console.error('Erro detalhado:', err);
            setMessage({
                type: 'error',
                text: 'Falha ao atualizar: ' + (err.message === 'signal is aborted without reason'
                    ? 'O link expirou devido a múltiplas tentativas. Peça um novo link.'
                    : err.message)
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-surface p-8 rounded-xl border border-slate-700 shadow-2xl">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">Redefinir Senha</h1>
                    <p className="text-slate-400">Insira sua nova senha abaixo</p>
                </div>

                {message && (
                    <div className={`mb-6 p-4 rounded-lg text-sm text-center border ${message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' :
                            message.type === 'info' ? 'bg-blue-500/10 border-blue-500/50 text-blue-400' :
                                'bg-red-500/10 border-red-500/50 text-red-500'
                        }`}>
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <input
                        type="password"
                        placeholder="Nova Senha"
                        required
                        className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                    />
                    <input
                        type="password"
                        placeholder="Confirmar Nova Senha"
                        required
                        className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                    />
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-primary hover:bg-primary-dark text-white font-bold rounded-lg transition-all disabled:opacity-50"
                    >
                        {loading ? 'Processando...' : 'Confirmar Nova Senha'}
                    </button>

                    {message?.type === 'error' && (
                        <button
                            type="button"
                            onClick={() => navigate('/area-cliente/esqueci-senha')}
                            className="w-full text-center text-sm text-primary hover:underline mt-4"
                        >
                            Solicitar novo link por e-mail
                        </button>
                    )}
                </form>
            </div>
        </div>
    );
};

export default RedefinirSenhaPage;
