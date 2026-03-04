import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';

const RedefinirSenhaPage: React.FC = () => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null);
    const navigate = useNavigate();
    const initAttempted = useRef(false);

    useEffect(() => {
        if (initAttempted.current) return;
        initAttempted.current = true;

        const setup = async () => {
            const hash = window.location.hash.substring(1);
            const search = window.location.search.substring(1);
            const params = new URLSearchParams(hash || search);
            const accessToken = params.get('access_token');
            const refreshToken = params.get('refresh_token');

            if (accessToken && refreshToken) {
                try {
                    // Tenta setar com timeout curto para não travar
                    const setSessionPromise = supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken
                    });
                    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000));
                    await Promise.race([setSessionPromise, timeout]);
                } catch (e) {
                    console.warn('Configuração inicial da sessão demorou, isso é OK se você digitar a senha e clicar em salvar.');
                }
            }
        };
        setup();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            setMessage({ type: 'error', text: 'As senhas não coincidem.' });
            return;
        }

        if (password.length < 6) {
            setMessage({ type: 'error', text: 'Senha muito curta. Mínimo 6 caracteres.' });
            return;
        }

        setLoading(true);
        setMessage({ type: 'info', text: 'Processando alteração de senha...' });

        try {
            // 1. Garantir sessão via tokens da URL caso getSession falhe
            const hash = window.location.hash.substring(1);
            const search = window.location.search.substring(1);
            const params = new URLSearchParams(hash || search);
            const accessToken = params.get('access_token');
            const refreshToken = params.get('refresh_token');

            if (accessToken && refreshToken) {
                // Força um login rápido se necessário
                await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
            }

            // 2. Atualizar o usuário
            const updatePromise = supabase.auth.updateUser({ password });
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('A operação demorou demais. Tente clicar em salvar uma última vez.')), 10000)
            );

            const { error } = await Promise.race([updatePromise, timeoutPromise]) as any;

            if (error) {
                // Se o erro for o tal do 'aborted' ou algo similar, tenta uma vez silenciosa sem race
                if (error.message?.includes('aborted')) {
                    const { error: finalTryError } = await supabase.auth.updateUser({ password });
                    if (finalTryError) throw finalTryError;
                } else {
                    throw error;
                }
            }

            setMessage({ type: 'success', text: 'Senha alterada com sucesso! Redirecionando...' });
            setTimeout(() => navigate('/area-cliente/login'), 2000);

        } catch (err: any) {
            console.error('Erro ao redefinir:', err);
            setMessage({
                type: 'error',
                text: 'Falha: ' + (err.message || 'Tente solicitar um novo link pelo e-mail se este erro persistir.')
            });
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-slate-800 p-8 rounded-2xl shadow-2xl border border-slate-700">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-white mb-2">Defina sua nova senha</h1>
                    <p className="text-slate-400 text-sm">Seu formulário está pronto para uso.</p>
                </div>

                {message && (
                    <div className={`mb-6 p-4 rounded-xl text-sm text-center border ${message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' :
                            message.type === 'info' ? 'bg-blue-500/20 border-blue-500/50 text-blue-300' :
                                'bg-red-500/10 border-red-500/50 text-red-400'
                        }`}>
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <input
                        type="password"
                        placeholder="Nova Senha"
                        required
                        className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white outline-none focus:border-blue-500 transition-all font-mono"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                    />
                    <input
                        type="password"
                        placeholder="Confirmar Senha"
                        required
                        className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white outline-none focus:border-blue-500 transition-all font-mono"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                    />

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-900/40 transition-all disabled:opacity-50"
                    >
                        {loading ? 'Redefinindo...' : 'Redefinir Senha agora'}
                    </button>

                    <button
                        type="button"
                        onClick={() => navigate('/area-cliente/login')}
                        className="w-full text-center text-xs text-slate-500 hover:text-slate-300"
                    >
                        Voltar para o Login
                    </button>
                </form>
            </div>
        </div>
    );
};

export default RedefinirSenhaPage;
