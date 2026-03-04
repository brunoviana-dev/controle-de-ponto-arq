import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';

const RedefinirSenhaPage: React.FC = () => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null);
    const navigate = useNavigate();
    const isSubmitting = useRef(false);

    useEffect(() => {
        // Tenta estabelecer a sessão assim que a página carrega
        const setup = async () => {
            const hash = window.location.hash.substring(1);
            const params = new URLSearchParams(hash);
            const accessToken = params.get('access_token');
            const refreshToken = params.get('refresh_token');

            if (accessToken && refreshToken) {
                await supabase.auth.setSession({
                    access_token: accessToken,
                    refresh_token: refreshToken
                }).catch(() => { /* ignora erro de abort inicial */ });
            }
        };
        setup();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (isSubmitting.current) return;

        if (password !== confirmPassword) {
            setMessage({ type: 'error', text: 'As senhas não coincidem.' });
            return;
        }

        isSubmitting.current = true;
        setLoading(true);
        setMessage({ type: 'info', text: 'Enviando nova senha...' });

        try {
            // Garante sessão antes do update
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                const hash = window.location.hash.substring(1);
                const params = new URLSearchParams(hash);
                const accessToken = params.get('access_token');
                const refreshToken = params.get('refresh_token');

                if (accessToken && refreshToken) {
                    await supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken
                    });
                } else {
                    throw new Error('Não foi possível validar seu acesso. Peça um novo link por e-mail.');
                }
            }

            // Tenta atualizar a senha
            const { error } = await supabase.auth.updateUser({ password });

            if (error) {
                // Se o erro for o "abortado", tentamos uma última vez após mini-delay
                if (error.message.includes('aborted')) {
                    await new Promise(r => setTimeout(r, 1000));
                    const { error: retryError } = await supabase.auth.updateUser({ password });
                    if (retryError) throw retryError;
                } else {
                    throw error;
                }
            }

            setMessage({ type: 'success', text: 'Senha alterada com sucesso!' });
            setTimeout(() => navigate('/area-cliente/login'), 2000);

        } catch (err: any) {
            console.error('Erro:', err);
            setMessage({
                type: 'error',
                text: err.message.includes('aborted')
                    ? 'O navegador interrompeu a conexão. Por favor, tente clicar novamente no botão.'
                    : 'Erro: ' + (err.message || 'Falha na comunicação.')
            });
        } finally {
            setLoading(false);
            isSubmitting.current = false;
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-slate-800 p-8 rounded-2xl shadow-2xl border border-slate-700">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">Nova Senha</h1>
                    <p className="text-slate-400">Digite sua nova senha de acesso</p>
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
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">Nova Senha</label>
                        <input
                            type="password"
                            required
                            className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            placeholder="••••••••"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">Confirmar Senha</label>
                        <input
                            type="password"
                            required
                            className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            placeholder="••••••••"
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-900/20 transition-all disabled:opacity-50 active:scale-[0.98]"
                    >
                        {loading ? 'Processando...' : 'Salvar Nova Senha'}
                    </button>

                    <button
                        type="button"
                        onClick={() => navigate('/area-cliente/login')}
                        className="w-full text-center text-sm text-slate-400 hover:text-white transition-colors"
                    >
                        Voltar para o Login
                    </button>
                </form>
            </div>
        </div>
    );
};

export default RedefinirSenhaPage;
