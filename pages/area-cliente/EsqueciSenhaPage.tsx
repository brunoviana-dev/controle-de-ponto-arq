import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';

const EsqueciSenhaPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/#/area-cliente/redefinir-senha`,
            });

            if (error) throw error;

            setMessage({
                type: 'success',
                text: 'Se este e-mail estiver cadastrado, você receberá um link para redefinir sua senha em instantes.'
            });
        } catch (err: any) {
            // Se for erro de limite (rate limit), avisar o usuário explicitamente
            if (err.message?.includes('rate limit') || err.status === 429) {
                setMessage({
                    type: 'error',
                    text: 'Muitas solicitações em pouco tempo. Por favor, aguarde pelo menos 1 minuto antes de tentar novamente.'
                });
            } else {
                // Para outros casos, manter a mensagem genérica por segurança
                setMessage({
                    type: 'success',
                    text: 'Se este e-mail estiver cadastrado, você receberá um link para redefinir sua senha em instantes.'
                });
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-surface p-8 rounded-xl border border-slate-700 shadow-2xl">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">Recuperar Senha</h1>
                    <p className="text-slate-400">Informe seu e-mail para receber o link de redefinição</p>
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
                        <label className="block text-sm font-medium text-slate-300 mb-1">E-mail</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                            placeholder="seu@email.com"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-primary hover:bg-primary-dark text-white font-bold rounded-lg transition-colors shadow-lg shadow-primary/20 disabled:opacity-50"
                    >
                        {loading ? 'Enviando...' : 'Enviar link'}
                    </button>

                    <div className="text-center mt-4">
                        <button
                            type="button"
                            onClick={() => navigate('/area-cliente/login')}
                            className="text-sm text-slate-400 hover:text-white transition-colors"
                        >
                            ← Voltar para o Login
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EsqueciSenhaPage;
