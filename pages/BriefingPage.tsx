import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BriefingAnexo, BriefingOpcao, BriefingPergunta, ProjetoTipo, Empresa } from '../services/interfaces/types';
import { briefingPerguntasService } from '../services/briefingPerguntasService';
import { getTiposAtivos } from '../services/projetoTiposService';
import { briefingRespostasService } from '../services/briefingRespostasService';
import { getEmpresaBySlug } from '../services/empresaService';

const BriefingPage: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const [empresa, setEmpresa] = useState<Empresa | null>(null);
    const [perguntas, setPerguntas] = useState<BriefingPergunta[]>([]);
    const [tiposProjeto, setTiposProjeto] = useState<ProjetoTipo[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitted, setSubmitted] = useState(false);
    const [notFound, setNotFound] = useState(false);
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
    const [fileRespostas, setFileRespostas] = useState<Record<string, File[]>>({});

    useEffect(() => {
        const loadInitialData = async () => {
            if (!slug) {
                setNotFound(true);
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                const [empresaData, perguntasData, tiposData] = await Promise.all([
                    getEmpresaBySlug(slug),
                    briefingPerguntasService.getPerguntas(),
                    getTiposAtivos()
                ]);

                if (!empresaData) {
                    setNotFound(true);
                } else {
                    setEmpresa(empresaData);
                    setPerguntas(perguntasData.filter(p => p.ativo));
                    setTiposProjeto(tiposData);
                }
            } catch (err: any) {
                console.error('Erro ao carregar dados:', err);
                setError('Ocorreu um erro ao carregar o formulário. Por favor, tente novamente mais tarde.');
            } finally {
                setLoading(false);
            }
        };

        loadInitialData();
    }, [slug]);

    const handleChangeFixed = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFixedData({ ...fixedData, [e.target.name]: e.target.value });
    };

    const handleChangeDynamic = (perguntaId: string, value: any) => {
        setDynamicRespostas({ ...dynamicRespostas, [perguntaId]: value });
    };

    const handleCheckboxChange = (perguntaId: string, value: string, checked: boolean) => {
        const current = dynamicRespostas[perguntaId] || [];
        if (checked) {
            handleChangeDynamic(perguntaId, [...current, value]);
        } else {
            handleChangeDynamic(perguntaId, current.filter((o: string) => o !== value));
        }
    };

    const handleFileChange = (perguntaId: string, files: FileList | null) => {
        if (!files) return;

        const newFiles = Array.from(files);
        const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'pdf'];
        const maxSize = 5 * 1024 * 1024; // 5MB

        // Validação 1: Máximo 5 arquivos
        if (newFiles.length > 5) {
            setError('Você pode enviar no máximo 5 arquivos por pergunta.');
            return;
        }

        // Validação 2: Extensões
        for (const file of newFiles) {
            const ext = file.name.split('.').pop()?.toLowerCase();
            if (!allowedExtensions.includes(ext || '')) {
                setError(`Arquivo "${file.name}" não permitido. Use apenas: ${allowedExtensions.join(', ')}`);
                return;
            }
        }

        // Validação 3: Tamanho total
        const totalSize = newFiles.reduce((acc, f) => acc + f.size, 0);
        if (totalSize > maxSize) {
            setError('O tamanho total dos arquivos selecionados excede o limite de 5MB.');
            return;
        }

        setError(null);
        setFileRespostas({ ...fileRespostas, [perguntaId]: newFiles });
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
            const hasResposta = dynamicRespostas[p.id] || (fileRespostas[p.id] && fileRespostas[p.id].length > 0);
            const isArrayEmpty = Array.isArray(dynamicRespostas[p.id]) && dynamicRespostas[p.id].length === 0;

            if (p.obrigatorio && (!hasResposta || isArrayEmpty)) {
                setError(`A pergunta "${p.pergunta}" é obrigatória.`);
                return;
            }
        }

        setIsSending(true);
        try {
            const briefingId = crypto.randomUUID();
            const anexos: BriefingAnexo[] = [];

            // Upload de arquivos antes de salvar a resposta
            for (const perguntaId in fileRespostas) {
                const files = fileRespostas[perguntaId];
                for (const file of files) {
                    const anexoMeta = await briefingRespostasService.uploadAnexo(file, briefingId);
                    anexoMeta.pergunta_id = perguntaId;
                    anexos.push(anexoMeta);
                }
            }

            await briefingRespostasService.enviarResposta({
                id: briefingId,
                ...fixedData,
                respostas: dynamicRespostas,
                anexos: anexos
            });
            setSubmitted(true);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err: any) {
            console.error('Erro ao enviar briefing:', err);
            setError(`Ocorreu um erro ao enviar suas respostas: ${err.message || 'Erro desconhecido.'}`);
        } finally {
            setIsSending(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#F5F4F1] flex items-center justify-center p-4">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#C8A46A]"></div>
                    <p className="text-[#6B6B6B] animate-pulse font-medium">Carregando formulário...</p>
                </div>
            </div>
        );
    }

    if (submitted) {
        return (
            <div className="min-h-screen bg-[#F5F4F1] flex items-center justify-center p-4 font-sans">
                <div className="max-w-md w-full bg-white border border-[#E6E2DC] rounded-2xl p-8 text-center shadow-xl">
                    <div className="w-16 h-16 bg-[#C8A46A]/10 text-[#C8A46A] rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-serif font-bold text-[#2E2E2E] mb-4">Recebemos seu Briefing!</h1>
                    <p className="text-[#6B6B6B] mb-8 leading-relaxed">
                        Muito obrigado por compartilhar seus detalhes conosco. Nossa equipe analisará as informações e entrará em contato em breve para darmos o próximo passo.
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        className="w-full py-3 bg-[#C8A46A] hover:bg-[#B69359] text-white font-bold rounded-lg transition-all shadow-lg shadow-[#C8A46A]/20"
                    >
                        Voltar ao Início
                    </button>
                </div>
            </div>
        );
    }

    if (notFound) {
        return (
            <div className="min-h-screen bg-[#F5F4F1] flex items-center justify-center p-4 font-sans text-center">
                <div className="max-w-md bg-white border border-[#E6E2DC] rounded-2xl p-8 shadow-xl">
                    <div className="text-6xl mb-6">🏜️</div>
                    <h1 className="text-2xl font-serif font-bold text-[#2E2E2E] mb-2">Briefing não encontrado</h1>
                    <p className="text-[#6B6B6B] mb-8">
                        O link acessado não corresponde a nenhum escritório ativo ou o endereço está incorreto.
                    </p>
                    <button
                        onClick={() => navigate('/login')}
                        className="px-8 py-3 bg-[#C8A46A] hover:bg-[#B69359] text-white font-bold rounded-lg transition-all"
                    >
                        Voltar
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F5F4F1] text-[#2E2E2E] font-sans">
            {/* Header Institucional / Hero */}
            <div className="relative h-[320px] md:h-[550px] w-full overflow-hidden bg-[#0A0A0A]">
                <img
                    src="/hero-briefing.png"
                    alt="Projeto Arquitetônico"
                    className="w-full h-full object-cover opacity-30 grayscale brightness-75 contrast-125"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/40 to-transparent flex items-center justify-center text-center p-4">
                    <div className="max-w-4xl animate-in fade-in zoom-in duration-700">
                        {empresa?.logo_url ? (
                            <img
                                src={empresa.logo_url}
                                alt={empresa.nome_fantasia || empresa.razao_social}
                                className="h-16 md:h-24 mx-auto mb-6 object-contain"
                            />
                        ) : (
                            <span className="text-[#C8A46A] uppercase tracking-[0.3em] font-bold text-xs md:text-sm mb-2 block drop-shadow-md">
                                {empresa?.nome_fantasia || empresa?.razao_social || 'UpSys Pro Arquitetura'}
                            </span>
                        )}
                        <h1 className="text-3xl md:text-5xl font-serif font-bold text-white mb-4 drop-shadow-lg">
                            {empresa?.titulo_briefing || 'Briefing de Projeto'}
                        </h1>
                        <p className="text-white/90 text-sm md:text-base max-w-3xl mx-auto font-light leading-relaxed px-4 sm:px-0 whitespace-pre-line">
                            {empresa?.texto_briefing || 'Transformando sonhos em espaços vividos. Preencha o briefing abaixo para iniciarmos a jornada de criação do seu novo projeto.'}
                        </p>
                    </div>
                </div>
            </div>

            <div className="max-w-[900px] mx-auto px-4 -mt-16 md:-mt-32 pb-20 relative z-10">
                <div className="bg-white rounded-xl shadow-[0_10px_40px_-15px_rgba(0,0,0,0.1)] border border-[#E6E2DC] overflow-hidden">
                    <div className="h-1.5 bg-[#C8A46A]"></div>

                    <form onSubmit={handleSubmit} className="p-6 md:p-12 space-y-10">
                        {error && (
                            <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-lg flex items-center gap-3 text-sm animate-in slide-in-from-top-2">
                                <span className="text-xl">⚠️</span>
                                {error}
                            </div>
                        )}

                        {/* Dados Fixos */}
                        <div className="space-y-6">
                            <h2 className="text-xl font-serif font-bold text-[#2E2E2E] border-b border-[#E6E2DC] pb-2">Informações de Contato</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-[#6B6B6B] uppercase tracking-wider ml-1">Nome Completo *</label>
                                    <input
                                        type="text"
                                        name="nome"
                                        required
                                        className="w-full bg-white border border-[#E6E2DC] rounded p-3 text-[#2E2E2E] focus:border-[#C8A46A] focus:ring-0 outline-none transition-all placeholder:text-[#E6E2DC]/80"
                                        placeholder="Seu nome"
                                        value={fixedData.nome}
                                        onChange={handleChangeFixed}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-[#6B6B6B] uppercase tracking-wider ml-1">E-mail *</label>
                                    <input
                                        type="email"
                                        name="email"
                                        required
                                        className="w-full bg-white border border-[#E6E2DC] rounded p-3 text-[#2E2E2E] focus:border-[#C8A46A] focus:ring-0 outline-none transition-all placeholder:text-[#E6E2DC]/80"
                                        placeholder="exemplo@email.com"
                                        value={fixedData.email}
                                        onChange={handleChangeFixed}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-[#6B6B6B] uppercase tracking-wider ml-1">Telefone / WhatsApp</label>
                                    <input
                                        type="tel"
                                        name="telefone"
                                        className="w-full bg-white border border-[#E6E2DC] rounded p-3 text-[#2E2E2E] focus:border-[#C8A46A] focus:ring-0 outline-none transition-all placeholder:text-[#E6E2DC]/80"
                                        placeholder="(00) 0 0000-0000"
                                        value={fixedData.telefone}
                                        onChange={handleChangeFixed}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-[#6B6B6B] uppercase tracking-wider ml-1">Tipo de Projeto *</label>
                                    <div className="relative">
                                        <select
                                            name="tipo_projeto_id"
                                            required
                                            className="w-full bg-white border border-[#E6E2DC] rounded p-3 text-[#2E2E2E] focus:border-[#C8A46A] focus:ring-0 outline-none transition-all appearance-none cursor-pointer"
                                            value={fixedData.tipo_projeto_id}
                                            onChange={handleChangeFixed}
                                        >
                                            <option value="" disabled>Selecione uma categoria...</option>
                                            {tiposProjeto.map(t => (
                                                <option key={t.id} value={t.id}>{t.nome}</option>
                                            ))}
                                        </select>
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#C8A46A]">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Pergunta Dinâmicas */}
                        <div className="space-y-12">
                            <h2 className="text-xl font-serif font-bold text-[#2E2E2E] border-b border-[#E6E2DC] pb-2">Detalhes do Projeto</h2>
                            {perguntas.map((p) => {
                                const options = (p.opcoes || []) as BriefingOpcao[];

                                return (
                                    <div key={p.id} className="group space-y-4">
                                        <label className="block text-base md:text-lg font-medium text-[#2E2E2E] group-focus-within:text-[#C8A46A] transition-colors">
                                            {p.pergunta} {p.obrigatorio && <span className="text-[#C8A46A]">*</span>}
                                        </label>

                                        {/* Texto */}
                                        {p.tipo === 'texto' && (
                                            <input
                                                type="text"
                                                className="w-full bg-white border border-[#E6E2DC] rounded-lg p-4 text-[#2E2E2E] focus:border-[#C8A46A] outline-none transition-all"
                                                placeholder="Sua resposta..."
                                                value={dynamicRespostas[p.id] || ''}
                                                onChange={(e) => handleChangeDynamic(p.id, e.target.value)}
                                            />
                                        )}

                                        {/* Textarea */}
                                        {p.tipo === 'textarea' && (
                                            <textarea
                                                rows={4}
                                                className="w-full bg-white border border-[#E6E2DC] rounded-lg p-4 text-[#2E2E2E] focus:border-[#C8A46A] outline-none transition-all resize-none"
                                                placeholder="Conte-nos mais detalhes..."
                                                value={dynamicRespostas[p.id] || ''}
                                                onChange={(e) => handleChangeDynamic(p.id, e.target.value)}
                                            ></textarea>
                                        )}

                                        {/* Numero */}
                                        {p.tipo === 'numero' && (
                                            <input
                                                type="number"
                                                className="w-full bg-white border border-[#E6E2DC] rounded-lg p-4 text-[#2E2E2E] focus:border-[#C8A46A] outline-none transition-all max-w-[150px]"
                                                value={dynamicRespostas[p.id] || ''}
                                                onChange={(e) => handleChangeDynamic(p.id, e.target.value)}
                                            />
                                        )}

                                        {/* Data */}
                                        {p.tipo === 'data' && (
                                            <input
                                                type="date"
                                                className="bg-white border border-[#E6E2DC] rounded-lg p-4 text-[#2E2E2E] focus:border-[#C8A46A] outline-none transition-all"
                                                value={dynamicRespostas[p.id] || ''}
                                                onChange={(e) => handleChangeDynamic(p.id, e.target.value)}
                                            />
                                        )}

                                        {/* Select */}
                                        {p.tipo === 'select' && (
                                            <div className="relative">
                                                <select
                                                    className="w-full bg-white border border-[#E6E2DC] rounded-lg p-4 text-[#2E2E2E] focus:border-[#C8A46A] outline-none transition-all appearance-none cursor-pointer"
                                                    value={dynamicRespostas[p.id] || ''}
                                                    onChange={(e) => handleChangeDynamic(p.id, e.target.value)}
                                                >
                                                    <option value="">Escolha uma opção...</option>
                                                    {options.map(opt => (
                                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                    ))}
                                                </select>
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#C8A46A]">
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                                </div>
                                            </div>
                                        )}

                                        {/* Radio (Grid) */}
                                        {p.tipo === 'radio' && (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                                {options.map(opt => {
                                                    const isSelected = dynamicRespostas[p.id] === opt.value;
                                                    return (
                                                        <label key={opt.value} className={`
                                                            relative flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all cursor-pointer overflow-hidden
                                                            ${isSelected
                                                                ? 'bg-[#C8A46A]/5 border-[#C8A46A] shadow-sm'
                                                                : 'bg-white border-[#E6E2DC] hover:border-[#C8A46A]/50 hover:bg-[#F5F4F1]/50'}
                                                        `}>
                                                            <input
                                                                type="radio"
                                                                className="sr-only"
                                                                name={p.id}
                                                                checked={isSelected}
                                                                onChange={() => handleChangeDynamic(p.id, opt.value)}
                                                            />
                                                            {opt.image_url && (
                                                                <div className="w-full aspect-video rounded-lg overflow-hidden mb-2 border border-[#E6E2DC]">
                                                                    <img src={opt.image_url} alt={opt.label} className="w-full h-full object-cover" />
                                                                </div>
                                                            )}
                                                            <span className={`text-sm font-semibold text-center ${isSelected ? 'text-[#C8A46A]' : 'text-[#2E2E2E]'}`}>
                                                                {opt.label}
                                                            </span>
                                                            {isSelected && (
                                                                <div className="absolute top-2 right-2 w-5 h-5 bg-[#C8A46A] text-white rounded-full flex items-center justify-center shadow-md">
                                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                                                </div>
                                                            )}
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        {/* Checkbox (Grid) */}
                                        {p.tipo === 'checkbox' && (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                                {options.map(opt => {
                                                    const isSelected = (dynamicRespostas[p.id] || []).includes(opt.value);
                                                    return (
                                                        <label key={opt.value} className={`
                                                            relative flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all cursor-pointer overflow-hidden
                                                            ${isSelected
                                                                ? 'bg-[#C8A46A]/5 border-[#C8A46A] shadow-sm'
                                                                : 'bg-white border-[#E6E2DC] hover:border-[#C8A46A]/50 hover:bg-[#F5F4F1]/50'}
                                                        `}>
                                                            <input
                                                                type="checkbox"
                                                                className="sr-only"
                                                                checked={isSelected}
                                                                onChange={(e) => handleCheckboxChange(p.id, opt.value, e.target.checked)}
                                                            />
                                                            {opt.image_url && (
                                                                <div className="w-full aspect-video rounded-lg overflow-hidden mb-2 border border-[#E6E2DC]">
                                                                    <img src={opt.image_url} alt={opt.label} className="w-full h-full object-cover" />
                                                                </div>
                                                            )}
                                                            <span className={`text-sm font-semibold text-center ${isSelected ? 'text-[#C8A46A]' : 'text-[#2E2E2E]'}`}>
                                                                {opt.label}
                                                            </span>
                                                            {isSelected && (
                                                                <div className="absolute top-2 right-2 w-5 h-5 bg-[#C8A46A] text-white rounded-full flex items-center justify-center shadow-md">
                                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                                                </div>
                                                            )}
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        {/* Arquivo */}
                                        {p.tipo === 'arquivo' && (
                                            <div className="space-y-4">
                                                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                                                    <label className="flex items-center gap-2 px-6 py-3 bg-white hover:bg-[#F5F4F1] border border-[#E6E2DC] rounded-lg cursor-pointer transition-all active:scale-95 group">
                                                        <svg className="w-5 h-5 text-[#C8A46A] group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                        </svg>
                                                        <span className="font-bold text-[#2E2E2E] text-sm">Anexar Arquivos</span>
                                                        <input
                                                            type="file"
                                                            multiple
                                                            className="hidden"
                                                            accept=".jpg,.jpeg,.png,.webp,.pdf"
                                                            onChange={(e) => handleFileChange(p.id, e.target.files)}
                                                        />
                                                    </label>
                                                    <span className="text-xs text-[#6B6B6B]">
                                                        Máx 5 arquivos (PDF ou Imagem) • Total até 5MB
                                                    </span>
                                                </div>

                                                {fileRespostas[p.id] && fileRespostas[p.id].length > 0 && (
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                        {fileRespostas[p.id].map((file, idx) => (
                                                            <div key={idx} className="flex items-center justify-between p-3 bg-[#F5F4F1]/50 border border-[#E6E2DC] rounded-lg">
                                                                <div className="flex items-center gap-3 overflow-hidden">
                                                                    <span className="text-lg">
                                                                        {file.type.includes('pdf') ? '📄' : '🖼️'}
                                                                    </span>
                                                                    <span className="text-sm text-[#2E2E2E] truncate font-medium">
                                                                        {file.name}
                                                                    </span>
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const updated = fileRespostas[p.id].filter((_, i) => i !== idx);
                                                                        setFileRespostas({ ...fileRespostas, [p.id]: updated });
                                                                    }}
                                                                    className="text-[#6B6B6B] hover:text-red-500 p-1 transition-colors"
                                                                >
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <div className="pt-8 border-t border-[#E6E2DC]">
                            <button
                                type="submit"
                                disabled={isSending}
                                className={`
                                    w-full py-4 bg-[#C8A46A] hover:bg-[#B69359] text-white text-lg font-bold rounded-xl transition-all shadow-xl shadow-[#C8A46A]/20 flex items-center justify-center gap-3
                                    ${isSending ? 'opacity-70 cursor-not-allowed' : 'hover:-translate-y-1 active:scale-95'}
                                `}
                            >
                                {isSending ? (
                                    <>
                                        <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white border-transparent"></div>
                                        {Object.values(fileRespostas).flat().length > 0 ? 'Enviando Arquivos...' : 'Enviando...'}
                                    </>
                                ) : (
                                    'Finalizar e Enviar Briefing'
                                )}
                            </button>
                            <p className="text-center text-[#6B6B6B] text-[10px] uppercase tracking-widest mt-6">
                                {empresa?.nome_fantasia || empresa?.razao_social || 'UpSys Pro'}
                            </p>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default BriefingPage;
