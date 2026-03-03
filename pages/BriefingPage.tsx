import React, { useEffect, useState } from 'react';
import { BriefingPergunta, ProjetoTipo } from '../services/interfaces/types';
import { briefingPerguntasService } from '../services/briefingPerguntasService';
import { getTiposAtivos } from '../services/projetoTiposService';
import { briefingRespostasService } from '../services/briefingRespostasService';

const BriefingPage: React.FC = () => {
    const [perguntas, setPerguntas] = useState<BriefingPergunta[]>([]);
    const [tiposProjeto, setTiposProjeto] = useState<ProjetoTipo[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSending, setIsSending] = useState(false);

    // Form data
    const [fixedData, setFixedData] = useState({
        nome: '',
        email: '',
        telefone: '',
        tipo_projeto_id: ''
    });
    const [dynamicRespostas, setDynamicRespostas] = useState<Record<string, any>>({});

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                setLoading(true);
                const [perguntasData, tiposData] = await Promise.all([
                    briefingPerguntasService.getPerguntas(),
                    getTiposAtivos()
                ]);
                setPerguntas(perguntasData.filter(p => p.ativo));
                setTiposProjeto(tiposData);
            } catch (err: any) {
                console.error('Erro ao carregar dados:', err);
                setError('Ocorreu um erro ao carregar o formulário. Por favor, tente novamente mais tarde.');
            } finally {
                setLoading(false);
            }
        };

        loadInitialData();
    }, []);

    const handleChangeFixed = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFixedData({ ...fixedData, [e.target.name]: e.target.value });
    };

    const handleChangeDynamic = (perguntaId: string, value: any) => {
        setDynamicRespostas({ ...dynamicRespostas, [perguntaId]: value });
    };

    const handleCheckboxChange = (perguntaId: string, opcao: string, checked: boolean) => {
        const current = dynamicRespostas[perguntaId] || [];
        if (checked) {
            handleChangeDynamic(perguntaId, [...current, opcao]);
        } else {
            handleChangeDynamic(perguntaId, current.filter((o: string) => o !== opcao));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Basic validation
        if (!fixedData.nome || !fixedData.email || !fixedData.tipo_projeto_id) {
            setError('Por favor, preencha todos os campos obrigatórios (Nome, Email e Tipo de Projeto).');
            return;
        }

        // Questions validation
        for (const p of perguntas) {
            if (p.obrigatorio && (!dynamicRespostas[p.id] || (Array.isArray(dynamicRespostas[p.id]) && dynamicRespostas[p.id].length === 0))) {
                setError(`A pergunta "${p.pergunta}" é obrigatória.`);
                return;
            }
        }

        setIsSending(true);
        try {
            await briefingRespostasService.enviarResposta({
                ...fixedData,
                respostas: dynamicRespostas
            });
            setSubmitted(true);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err: any) {
            setError('Ocorreu um erro ao enviar suas respostas. Por favor, verifique os dados e tente novamente.');
        } finally {
            setIsSending(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                    <p className="text-slate-400 animate-pulse">Carregando formulário...</p>
                </div>
            </div>
        );
    }

    if (submitted) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center shadow-2xl">
                    <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-4">Recebemos seu Briefing!</h1>
                    <p className="text-slate-400 mb-8 leading-relaxed">
                        Muito obrigado por compartilhar seus detalhes conosco. Nossa equipe analisará as informações e entrará em contato em breve.
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        className="w-full py-3 bg-primary hover:bg-primary-dark text-white font-bold rounded-lg transition-all"
                    >
                        Enviar outro briefing
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 py-12 px-4 selection:bg-primary/30">
            <div className="max-w-3xl mx-auto">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-black text-white mb-4 tracking-tight">Briefing de Projeto</h1>
                    <p className="text-slate-400 text-lg">Conte-nos um pouco sobre sua ideia para começarmos a planejar seu sonho.</p>
                </div>

                <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
                    <div className="h-2 bg-gradient-to-r from-primary to-primary-dark"></div>
                    <form onSubmit={handleSubmit} className="p-8 space-y-8">
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-lg flex items-center gap-3 text-sm animate-in slide-in-from-top-2">
                                <span className="text-xl">⚠️</span>
                                {error}
                            </div>
                        )}

                        {/* Dados Fixos */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Nome Completo *</label>
                                <input
                                    type="text"
                                    name="nome"
                                    required
                                    className="w-full bg-slate-800/50 border border-slate-700 rounded-lg p-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                                    placeholder="Como devemos te chamar?"
                                    value={fixedData.nome}
                                    onChange={handleChangeFixed}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">E-mail para Contato *</label>
                                <input
                                    type="email"
                                    name="email"
                                    required
                                    className="w-full bg-slate-800/50 border border-slate-700 rounded-lg p-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                                    placeholder="exemplo@email.com"
                                    value={fixedData.email}
                                    onChange={handleChangeFixed}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">WhatsApp / Telefone</label>
                                <input
                                    type="tel"
                                    name="telefone"
                                    className="w-full bg-slate-800/50 border border-slate-700 rounded-lg p-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                                    placeholder="(00) 0 0000-0000"
                                    value={fixedData.telefone}
                                    onChange={handleChangeFixed}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Tipo de Projeto *</label>
                                <select
                                    name="tipo_projeto_id"
                                    required
                                    className="w-full bg-slate-800/50 border border-slate-700 rounded-lg p-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all appearance-none cursor-pointer"
                                    value={fixedData.tipo_projeto_id}
                                    onChange={handleChangeFixed}
                                >
                                    <option value="" disabled>Selecione uma categoria...</option>
                                    {tiposProjeto.map(t => (
                                        <option key={t.id} value={t.id}>{t.nome}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="h-px bg-slate-800 my-8"></div>

                        {/* Pergunta Dinâmicas */}
                        <div className="space-y-10">
                            {perguntas.map((p) => (
                                <div key={p.id} className="group space-y-4">
                                    <label className="block text-lg font-medium text-white group-focus-within:text-primary transition-colors">
                                        {p.pergunta} {p.obrigatorio && <span className="text-red-500">*</span>}
                                    </label>

                                    {/* Texto */}
                                    {p.tipo === 'texto' && (
                                        <input
                                            type="text"
                                            className="w-full bg-slate-800/40 border border-slate-700/60 rounded-xl p-4 text-white focus:border-primary focus:bg-slate-800/60 outline-none transition-all shadow-inner"
                                            placeholder="Sua resposta aqui..."
                                            value={dynamicRespostas[p.id] || ''}
                                            onChange={(e) => handleChangeDynamic(p.id, e.target.value)}
                                        />
                                    )}

                                    {/* Textarea */}
                                    {p.tipo === 'textarea' && (
                                        <textarea
                                            rows={4}
                                            className="w-full bg-slate-800/40 border border-slate-700/60 rounded-xl p-4 text-white focus:border-primary focus:bg-slate-800/60 outline-none transition-all shadow-inner"
                                            placeholder="Conte-nos mais detalhes..."
                                            value={dynamicRespostas[p.id] || ''}
                                            onChange={(e) => handleChangeDynamic(p.id, e.target.value)}
                                        ></textarea>
                                    )}

                                    {/* Numero */}
                                    {p.tipo === 'numero' && (
                                        <input
                                            type="number"
                                            className="w-full bg-slate-800/40 border border-slate-700/60 rounded-xl p-4 text-white focus:border-primary outline-none transition-all max-w-[200px]"
                                            value={dynamicRespostas[p.id] || ''}
                                            onChange={(e) => handleChangeDynamic(p.id, e.target.value)}
                                        />
                                    )}

                                    {/* Data */}
                                    {p.tipo === 'data' && (
                                        <input
                                            type="date"
                                            className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-4 text-white focus:border-primary outline-none transition-all color-scheme-dark"
                                            value={dynamicRespostas[p.id] || ''}
                                            onChange={(e) => handleChangeDynamic(p.id, e.target.value)}
                                        />
                                    )}

                                    {/* Select */}
                                    {p.tipo === 'select' && (
                                        <select
                                            className="w-full bg-slate-800/40 border border-slate-700/60 rounded-xl p-4 text-white focus:border-primary outline-none transition-all appearance-none cursor-pointer"
                                            value={dynamicRespostas[p.id] || ''}
                                            onChange={(e) => handleChangeDynamic(p.id, e.target.value)}
                                        >
                                            <option value="">Escolha uma opção...</option>
                                            {p.opcoes?.map(opt => (
                                                <option key={opt} value={opt}>{opt}</option>
                                            ))}
                                        </select>
                                    )}

                                    {/* Radio */}
                                    {p.tipo === 'radio' && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {p.opcoes?.map(opt => (
                                                <label key={opt} className={`
                                                    flex items-center gap-3 p-4 rounded-xl border border-slate-700/60 cursor-pointer transition-all
                                                    ${dynamicRespostas[p.id] === opt ? 'bg-primary/10 border-primary text-white shadow-lg' : 'hover:bg-slate-800/60'}
                                                `}>
                                                    <input
                                                        type="radio"
                                                        name={p.id}
                                                        className="w-4 h-4 accent-primary"
                                                        checked={dynamicRespostas[p.id] === opt}
                                                        onChange={() => handleChangeDynamic(p.id, opt)}
                                                    />
                                                    <span>{opt}</span>
                                                </label>
                                            ))}
                                        </div>
                                    )}

                                    {/* Checkbox */}
                                    {p.tipo === 'checkbox' && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {p.opcoes?.map(opt => (
                                                <label key={opt} className={`
                                                    flex items-center gap-3 p-4 rounded-xl border border-slate-700/60 cursor-pointer transition-all
                                                    ${(dynamicRespostas[p.id] || []).includes(opt) ? 'bg-primary/10 border-primary text-white shadow-lg' : 'hover:bg-slate-800/60'}
                                                `}>
                                                    <input
                                                        type="checkbox"
                                                        className="w-4 h-4 accent-primary rounded"
                                                        checked={(dynamicRespostas[p.id] || []).includes(opt)}
                                                        onChange={(e) => handleCheckboxChange(p.id, opt, e.target.checked)}
                                                    />
                                                    <span>{opt}</span>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="pt-8">
                            <button
                                type="submit"
                                disabled={isSending}
                                className={`
                                    w-full py-4 bg-primary hover:bg-primary-dark text-white text-lg font-black rounded-xl transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-3
                                    ${isSending ? 'opacity-70 cursor-not-allowed translate-y-0.5' : 'hover:-translate-y-1'}
                                `}
                            >
                                {isSending ? (
                                    <>
                                        <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-primary border-transparent"></div>
                                        Enviando...
                                    </>
                                ) : (
                                    'Finalizar e Enviar Briefing'
                                )}
                            </button>
                            <p className="text-center text-slate-500 text-xs mt-4">
                                Ao enviar, você concorda em compartilhar seus dados para fins de orçamento e planejamento.
                            </p>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default BriefingPage;
