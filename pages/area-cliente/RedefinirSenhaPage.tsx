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
        // Tenta apenas uma vez extrair e configurar a sessão
        const params = new URLSearchParams(window.location.hash.substring(1) || window.location.search.substring(1));
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        if (accessToken && refreshToken) {
            supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken
            }).catch(console.error);
        }
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            setMessage({ type: 'error', text: 'As senhas não coincidem.' });
            return;
        }

        setLoading(true);
        setMessage({ type: 'info', text: 'Processando alteração...' });

        // Timer de segurança para não travar a UI
        const timeout = setTimeout(() => {
            if (loading) {
                setLoading(false);
                setMessage({ type: 'error', text: 'A operação demorou muito. Por favor, tente clicar em salvar novamente.' });
            }
        }, 15000);

        try {
            // Garante que o usuário está autenticado pelo link
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                const params = new URLSearchParams(window.location.hash.substring(1) || window.location.search.substring(1));
                const accessToken = params.get('access_token');
                const refreshToken = params.get('refresh_token');

                if (accessToken && refreshToken) {
                    await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
                } else {
                    throw new Error('Link de acesso não detectado. Peça um novo link.');
                }
            }

            const { error } = await supabase.auth.updateUser({ password });
            clearTimeout(timeout);

            if (error) throw error;

            setMessage({ type: 'success', text: 'Senha alterada com sucesso!' });
            setTimeout(() => navigate('/area-cliente/login'), 2000);

        } catch (err: any) {
            clearTimeout(timeout);
            console.error('Falha geral:', err);

            let errorText = err.message || 'Erro de conexão.';
            if (errorText.includes('aborted')) {
                errorText = 'A conexão foi interrompida. Clique em salvar novamente para concluir.';
            }

            setMessage({ type: 'error', text: 'Falha: ' + errorText });
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-slate-800 p-8 rounded-2xl shadow-2xl border border-slate-700">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">Nova Senha</h1>
                    <p className="text-slate-400">Insira sua nova senha de acesso</p>
                </div>

                {message && (
                    <div className={`mb-6 p-4 rounded-xl text-sm text-center border ${message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' :
                            message.type === 'info' ? 'bg-blue-500/20 border-blue-500/50 text-blue-300' :
                                'bg-red-500/10 border-red-500/50 text-red-400'
                        }`}>
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <input
                        type="password"
                        placeholder="Nova Senha"
                        required
                        disabled={loading && !message}
                        className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white outline-none focus:border-blue-500 transition-all"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                    />
                    <input
                        type="password"
                        placeholder="Confirmar Nova Senha"
                        required
                        disabled={loading && !message}
                        className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white outline-none focus:border-blue-500 transition-all"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                    />
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all disabled:opacity-50"
                    >
                        {loading ? 'Salvando...' : 'Salvar Alteração'}
                    </button>

                    {!loading && (
                        <button
                            type="button"
                            onClick={() => navigate('/area-cliente/login')}
                            className="w-full text-center text-sm text-slate-500 hover:text-slate-300"
                        >
                            Cancelar e voltar
                        </button>
                    )}
                </form>
            </div>
        </div>
    );
};

export default RedefinirSenhaPage;
