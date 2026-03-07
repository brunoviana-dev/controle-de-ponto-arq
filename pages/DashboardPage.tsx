import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../services/interfaces/types';
import { getDashboardData, DashboardNotificacao, DashboardResumo } from '../services/dashboardService';
import { ContaPagar, ResumoPagamento } from '../services/interfaces/types';
import { contasPagarService } from '../services/contasPagarService';
import RegistrarPagamentoModal from '../components/RegistrarPagamentoModal';
import ConfirmarPagamentoColaboradorModal from '../components/ConfirmarPagamentoColaboradorModal';

// ─── Ícones SVG inline ───────────────────────────────────────────────────────

const IconTarefa = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const IconEtapa = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
);

const IconParcela = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
);

const IconBriefing = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
);

const IconArrow = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 flex-shrink-0">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
);

const IconProjetos = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
);

const IconFinanceiro = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const IconTarefasCard = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
);

const IconBriefingCard = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
    </svg>
);

const IconRefresh = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
);

// ─── Configuração de notificações ─────────────────────────────────────────────

const notifConfig: Record<DashboardNotificacao['tipo'], { cor: string; bgCor: string; icone: React.ReactNode }> = {
    tarefa_atribuida: {
        cor: 'text-blue-400',
        bgCor: 'bg-blue-500/20 border-blue-500/30',
        icone: <IconTarefa />
    },
    tarefa_atrasada: {
        cor: 'text-red-400',
        bgCor: 'bg-red-500/20 border-red-500/30',
        icone: <IconEtapa />
    },
    etapa_atrasada: {
        cor: 'text-amber-400',
        bgCor: 'bg-amber-500/20 border-amber-500/30',
        icone: <IconEtapa />
    },
    parcela_vencendo: {
        cor: 'text-orange-400',
        bgCor: 'bg-orange-500/20 border-orange-500/30',
        icone: <IconParcela />
    },
    conta_vencendo: {
        cor: 'text-rose-400',
        bgCor: 'bg-rose-500/20 border-rose-500/30',
        icone: <IconParcela />
    },
    briefing_novo: {
        cor: 'text-emerald-400',
        bgCor: 'bg-emerald-500/20 border-emerald-500/30',
        icone: <IconBriefing />
    },
    pagamento_colaborador: {
        cor: 'text-blue-400',
        bgCor: 'bg-blue-500/20 border-blue-500/30',
        icone: <IconFinanceiro />
    }
};

// ─── Formatador de moeda ──────────────────────────────────────────────────────

const formatarMoeda = (valor: number): string =>
    valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// ─── Componente principal ─────────────────────────────────────────────────────

const DashboardPage: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const isAdmin = user?.role === UserRole.ADMIN;

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [notificacoes, setNotificacoes] = useState<DashboardNotificacao[]>([]);
    const [resumo, setResumo] = useState<DashboardResumo | null>(null);
    const [erro, setErro] = useState<string | null>(null);
    const [selectedConta, setSelectedConta] = useState<ContaPagar | null>(null);
    const [isPagamentoModalOpen, setIsPagamentoModalOpen] = useState(false);
    const [selectedPagamentoColab, setSelectedPagamentoColab] = useState<ResumoPagamento | null>(null);
    const [isPagamentoColabModalOpen, setIsPagamentoColabModalOpen] = useState(false);

    const mesAtual = new Date().getMonth() + 1;
    const anoAtual = new Date().getFullYear();

    const carregarDados = useCallback(async (showRefreshing = false) => {
        try {
            if (showRefreshing) setRefreshing(true);
            else setLoading(true);
            setErro(null);

            const dados = await getDashboardData();
            setNotificacoes(dados.notificacoes);
            setResumo(dados.resumo);
        } catch (err: any) {
            console.error('Erro ao carregar dashboard:', err);
            setErro('Não foi possível carregar os dados do painel. Tente novamente.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        carregarDados();
    }, [carregarDados]);

    const abrirModalPagamento = async (contaId: string) => {
        try {
            const { data, error } = await contasPagarService.getById(contaId);
            if (error) throw error;
            if (data) {
                setSelectedConta(data);
                setIsPagamentoModalOpen(true);
            }
        } catch (err) {
            console.error('Erro ao buscar conta:', err);
            alert('Erro ao carregar detalhes da conta.');
        }
    };

    // ─── Skeleton de loading ────────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="space-y-6 animate-pulse">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="h-8 bg-slate-700/50 rounded-lg w-48 mb-2"></div>
                        <div className="h-4 bg-slate-700/30 rounded w-64"></div>
                    </div>
                </div>

                {/* Notificações skeleton */}
                <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-14 bg-slate-800/50 border border-slate-700/50 rounded-xl"></div>
                    ))}
                </div>

                {/* Cards skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-40 bg-slate-800/50 border border-slate-700/50 rounded-2xl"></div>
                    ))}
                </div>
            </div>
        );
    }

    // ─── Erro ───────────────────────────────────────────────────────────────────

    if (erro) {
        return (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
                <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
                    <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <p className="text-slate-400 text-center">{erro}</p>
                <button
                    onClick={() => carregarDados()}
                    className="px-4 py-2 bg-primary/20 text-primary border border-primary/30 rounded-lg hover:bg-primary/30 transition-all text-sm font-medium"
                >
                    Tentar novamente
                </button>
            </div>
        );
    }

    const saudacao = () => {
        const h = new Date().getHours();
        if (h < 12) return 'Bom dia';
        if (h < 18) return 'Boa tarde';
        return 'Boa noite';
    };

    return (
        <div className="space-y-8">

            {/* ─── Cabeçalho ─────────────────────────────────────────────────────── */}
            <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-white">
                        {saudacao()}, {user?.name?.split(' ')[0]} 👋
                    </h1>
                    <p className="text-slate-400 mt-1 text-sm">
                        {new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                </div>
                <button
                    onClick={() => carregarDados(true)}
                    disabled={refreshing}
                    className="flex items-center space-x-2 px-4 py-2 bg-slate-800/80 border border-slate-700/50 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700 transition-all text-sm font-medium"
                >
                    <span className={refreshing ? 'animate-spin' : ''}><IconRefresh /></span>
                    <span>{refreshing ? 'Atualizando...' : 'Atualizar'}</span>
                </button>
            </div>

            {/* ─── Seção de Notificações ──────────────────────────────────────────── */}
            <section>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-primary animate-pulse inline-block"></span>
                        Notificações
                    </h2>
                    {notificacoes.length > 0 && (
                        <span className="text-xs font-semibold text-primary bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-full">
                            {notificacoes.length} {notificacoes.length === 1 ? 'alerta' : 'alertas'}
                        </span>
                    )}
                </div>

                {notificacoes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 bg-slate-800/30 border border-slate-700/30 rounded-2xl text-center">
                        <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mb-3">
                            <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <p className="text-slate-300 font-medium">Tudo em dia!</p>
                        <p className="text-slate-500 text-sm mt-1">Nenhuma notificação pendente.</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {notificacoes.map((notif, idx) => {
                            const config = notifConfig[notif.tipo];
                            return (
                                <button
                                    key={notif.id}
                                    onClick={() => {
                                        if (notif.tipo === 'conta_vencendo' && notif.referenciaId) {
                                            abrirModalPagamento(notif.referenciaId);
                                        } else if (notif.tipo === 'pagamento_colaborador' && notif.extraData) {
                                            setSelectedPagamentoColab(notif.extraData);
                                            setIsPagamentoColabModalOpen(true);
                                        } else {
                                            navigate(notif.link);
                                        }
                                    }}
                                    className={`
                    w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-all duration-200
                    hover:translate-x-1 hover:shadow-lg text-left group
                    ${config.bgCor} backdrop-blur-sm
                    animate-fadeInUp
                  `}
                                    style={{ animationDelay: `${idx * 60}ms` }}
                                >
                                    <span className={`flex-shrink-0 ${config.cor}`}>{config.icone}</span>
                                    <span className="flex-1 text-sm text-slate-200 font-medium leading-snug">
                                        {notif.mensagem}
                                    </span>
                                    <span className={`${config.cor} opacity-60 group-hover:opacity-100 transition-opacity`}>
                                        <IconArrow />
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                )}
            </section>

            {/* ─── Seção de Resumo Geral ──────────────────────────────────────────── */}
            {resumo && (
                <section>
                    <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-slate-500 inline-block"></span>
                        Visão Geral
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                        {/* ── Card: Projetos ─────────────────────────────────────────── */}
                        <div
                            onClick={() => navigate('/projetos')}
                            className="group cursor-pointer bg-surface/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl overflow-hidden
                         shadow-xl hover:shadow-blue-500/10 hover:border-blue-500/30 transition-all duration-300"
                        >
                            {/* Header do card */}
                            <div className="px-5 py-4 bg-gradient-to-r from-blue-600 to-blue-500 flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center text-white">
                                    <IconProjetos />
                                </div>
                                <h3 className="text-white font-bold text-base">Projetos</h3>
                            </div>

                            {/* Corpo do card */}
                            <div className="p-5 space-y-3">
                                <div className="flex items-center justify-between py-2 border-b border-slate-700/40">
                                    <div className="flex items-center gap-2 text-slate-400 text-sm">
                                        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span>Não Iniciados</span>
                                    </div>
                                    <span className="font-bold text-slate-400 text-lg">{resumo.projetos.naoIniciados}</span>
                                </div>

                                <div className="flex items-center justify-between py-2 border-b border-slate-700/40">
                                    <div className="flex items-center gap-2 text-slate-400 text-sm">
                                        <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                                        </svg>
                                        <span>Em Andamento</span>
                                    </div>
                                    <span className="font-bold text-white text-lg">{resumo.projetos.emAndamento}</span>
                                </div>

                                <div className="flex items-center justify-between py-2">
                                    <div className="flex items-center gap-2 text-slate-400 text-sm">
                                        <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span>Etapas Atrasadas</span>
                                    </div>
                                    <span className={`font-bold text-lg ${resumo.projetos.etapasAtrasadas > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                        {resumo.projetos.etapasAtrasadas}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* ── Card: Financeiro do Mês (apenas admin) ─────────────────── */}
                        {isAdmin ? (
                            <div
                                onClick={() => navigate('/admin/relatorios')}
                                className="group cursor-pointer bg-surface/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl overflow-hidden
                           shadow-xl hover:shadow-emerald-500/10 hover:border-emerald-500/30 transition-all duration-300"
                            >
                                <div className="px-5 py-4 bg-gradient-to-r from-emerald-600 to-green-500 flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center text-white">
                                        <IconFinanceiro />
                                    </div>
                                    <h3 className="text-white font-bold text-base">Financeiro do Mês</h3>
                                </div>

                                <div className="p-5 space-y-3">
                                    <div className="flex items-center justify-between py-2 border-b border-slate-700/40">
                                        <div className="flex items-center gap-2 text-slate-400 text-sm">
                                            <div className="w-4 h-4 rounded-full bg-blue-400/20 flex items-center justify-center">
                                                <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                                            </div>
                                            <span>Previsto</span>
                                        </div>
                                        <span className="font-bold text-white">{formatarMoeda(resumo.financeiro.totalPrevisto)}</span>
                                    </div>

                                    <div className="flex items-center justify-between py-2 border-b border-slate-700/40">
                                        <div className="flex items-center gap-2 text-slate-400 text-sm">
                                            <div className="w-4 h-4 rounded-full bg-emerald-400/20 flex items-center justify-center">
                                                <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                                            </div>
                                            <span>Pago</span>
                                        </div>
                                        <span className="font-bold text-emerald-400">{formatarMoeda(resumo.financeiro.totalPago)}</span>
                                    </div>

                                    <div className="flex items-center justify-between py-2">
                                        <div className="flex items-center gap-2 text-slate-400 text-sm">
                                            <div className="w-4 h-4 rounded-full bg-amber-400/20 flex items-center justify-center">
                                                <div className="w-2 h-2 rounded-full bg-amber-400"></div>
                                            </div>
                                            <span>A Pagar</span>
                                        </div>
                                        <span className={`font-bold ${resumo.financeiro.totalAPagar > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                            {formatarMoeda(resumo.financeiro.totalAPagar > 0 ? resumo.financeiro.totalAPagar : 0)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* Colaborador: card vazio no lugar do financeiro */
                            <div className="bg-surface/30 backdrop-blur-sm border border-slate-700/30 rounded-2xl p-5 flex items-center justify-center">
                                <p className="text-slate-600 text-sm text-center">Dados financeiros<br />disponíveis apenas para admins</p>
                            </div>
                        )}

                        {/* ── Card: Tarefas ───────────────────────────────────────────── */}
                        <div
                            onClick={() => navigate('/calendario')}
                            className="group cursor-pointer bg-surface/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl overflow-hidden
                         shadow-xl hover:shadow-purple-500/10 hover:border-purple-500/30 transition-all duration-300"
                        >
                            <div className="px-5 py-4 bg-gradient-to-r from-purple-600 to-violet-500 flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center text-white">
                                    <IconTarefasCard />
                                </div>
                                <h3 className="text-white font-bold text-base">Tarefas</h3>
                            </div>

                            <div className="p-5 space-y-3">
                                <div className="flex items-center justify-between py-2 border-b border-slate-700/40">
                                    <div className="flex items-center gap-2 text-slate-400 text-sm">
                                        <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        <span>Tarefas Hoje</span>
                                    </div>
                                    <span className="font-bold text-white text-lg">{resumo.tarefas.hoje}</span>
                                </div>

                                <div className="flex items-center justify-between py-2">
                                    <div className="flex items-center gap-2 text-slate-400 text-sm">
                                        <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span>Tarefas Atrasadas</span>
                                    </div>
                                    <span className={`font-bold text-lg ${resumo.tarefas.atrasadas > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                        {resumo.tarefas.atrasadas}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* ── Card: Briefings (apenas admin) ─────────────────────────── */}
                        {isAdmin && (
                            <div
                                onClick={() => navigate('/admin/briefing-respostas')}
                                className="group cursor-pointer bg-surface/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl overflow-hidden
                           shadow-xl hover:shadow-orange-500/10 hover:border-orange-500/30 transition-all duration-300"
                            >
                                <div className="px-5 py-4 bg-gradient-to-r from-orange-500 to-amber-500 flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center text-white">
                                        <IconBriefingCard />
                                    </div>
                                    <h3 className="text-white font-bold text-base">Briefings</h3>
                                </div>

                                <div className="p-5">
                                    <div className="flex items-center justify-between py-2">
                                        <div className="flex items-center gap-2 text-slate-400 text-sm">
                                            <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                            </svg>
                                            <span>Novos Briefings (não lidos)</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-white text-lg">{resumo.briefings.novos}</span>
                                            {resumo.briefings.novos > 0 && (
                                                <span className="w-2.5 h-2.5 rounded-full bg-orange-400 animate-pulse"></span>
                                            )}
                                        </div>
                                    </div>

                                    {resumo.briefings.novos > 0 && (
                                        <div className="mt-4 pt-3 border-t border-slate-700/40">
                                            <p className="text-xs text-orange-400/80 flex items-center gap-1.5">
                                                <span>•</span>
                                                <span>Clique para ver as respostas recebidas</span>
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Colaborador: card calendário no lugar do briefing */}
                        {!isAdmin && (
                            <div
                                onClick={() => navigate('/calendario')}
                                className="group cursor-pointer bg-surface/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl overflow-hidden
                           shadow-xl hover:shadow-cyan-500/10 hover:border-cyan-500/30 transition-all duration-300"
                            >
                                <div className="px-5 py-4 bg-gradient-to-r from-cyan-600 to-sky-500 flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center text-white">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-white font-bold text-base">Meu Calendário</h3>
                                </div>
                                <div className="p-5">
                                    <p className="text-slate-400 text-sm">Acesse o calendário para ver suas tarefas e etapas de projeto.</p>
                                    <div className="mt-4 flex items-center gap-1 text-cyan-400 text-xs font-medium group-hover:gap-2 transition-all">
                                        <span>Abrir calendário</span>
                                        <IconArrow />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </section>
            )}

            {/* Estilos de animação inline */}
            <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeInUp {
          animation: fadeInUp 0.3s ease both;
        }
      `}</style>

            <RegistrarPagamentoModal
                isOpen={isPagamentoModalOpen}
                conta={selectedConta}
                mesReferencia={mesAtual}
                anoReferencia={anoAtual}
                onClose={() => {
                    setIsPagamentoModalOpen(false);
                    setSelectedConta(null);
                }}
                onSuccess={() => carregarDados(true)}
            />

            <ConfirmarPagamentoColaboradorModal
                isOpen={isPagamentoColabModalOpen}
                paymentTarget={selectedPagamentoColab}
                onClose={() => {
                    setIsPagamentoColabModalOpen(false);
                    setSelectedPagamentoColab(null);
                }}
                onSuccess={() => carregarDados(true)}
            />
        </div>
    );
};

export default DashboardPage;
