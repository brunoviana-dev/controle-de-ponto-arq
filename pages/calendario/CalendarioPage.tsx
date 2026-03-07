import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getEmpresaAtualId } from '../../utils/config';
import { tarefasService, TarefaComRelacionamentos } from '../../services/tarefasService';
import { getAllEtapasCalendario } from '../../services/projetoEtapasService';
import { getColaboradores } from '../../services/colaboradorService';
import { ProjetoEtapa, UserRole, Colaborador } from '../../services/interfaces/types';
import CalendarGrid, { VisaoCalendario, TarefaLocal } from './components/CalendarGrid';
import TarefaModal from './components/TarefaModal';
import TarefaDetalheModal from './components/TarefaDetalheModal';

const CalendarioPage: React.FC = () => {
    const { user } = useAuth();
    const isAdmin = user?.role === UserRole.ADMIN;

    const [dataBase, setDataBase] = useState(new Date());
    const [visao, setVisao] = useState<VisaoCalendario>('mes');

    const [tarefas, setTarefas] = useState<TarefaComRelacionamentos[]>([]);
    const [etapas, setEtapas] = useState<(ProjetoEtapa & { projeto?: { nome_projeto: string } })[]>([]);
    const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);

    const [filtroColaborador, setFiltroColaborador] = useState<string>('');
    const [loading, setLoading] = useState(true);

    // Controle de Modais
    const [isModalAddOpen, setIsModalAddOpen] = useState(false);
    const [tarefaSelecionada, setTarefaSelecionada] = useState<TarefaLocal | null>(null);
    const [tarefaEdicaoId, setTarefaEdicaoId] = useState<string | null>(null);

    // Carrega colaboradores sempre (não só para admin), para exibir nomes no modal de detalhe
    useEffect(() => {
        carregarColaboradores();
    }, []);

    useEffect(() => {
        carregarDados();
    }, [dataBase, filtroColaborador]);

    // Se o usuário não for admin, ele filtra à força pelas tarefas dele mesmo
    // Para admins, pode buscar tudo vazio (todos) ou usar o filtroColaborador do select
    const colabIdParaFiltro = isAdmin ? (filtroColaborador || undefined) : user?.id;

    const carregarDados = async () => {
        setLoading(true);
        try {
            const empresaId = getEmpresaAtualId();

            const [tarefasData, etapasData] = await Promise.all([
                tarefasService.getTarefas(empresaId, { colaboradorId: colabIdParaFiltro }),
                getAllEtapasCalendario(empresaId, { colaboradorId: colabIdParaFiltro })
            ]);

            setTarefas(tarefasData);
            setEtapas(etapasData);
        } catch (error) {
            console.error('Erro ao carregar calendário:', error);
            alert('Não foi possível carregar os dados do calendário.');
        } finally {
            setLoading(false);
        }
    };

    const carregarColaboradores = async () => {
        try {
            const resp = await getColaboradores();
            setColaboradores(resp);
        } catch (error) {
            console.error('Erro ao carregar filtro de colaboradores', error);
        }
    };

    // Funções de Navegação do Mês/Semana/Dia
    const navegarTempo = (direcao: number) => {
        const novaData = new Date(dataBase);
        if (visao === 'mes') {
            novaData.setMonth(novaData.getMonth() + direcao);
        } else if (visao === 'semana') {
            novaData.setDate(novaData.getDate() + (direcao * 7));
        } else {
            novaData.setDate(novaData.getDate() + direcao);
        }
        setDataBase(novaData);
    };

    const irParaHoje = () => setDataBase(new Date());

    // Tratamento da Exibição da Data Atual
    const formatHeaderDate = () => {
        if (visao === 'mes') {
            return dataBase.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        }
        if (visao === 'semana') {
            const inicio = new Date(dataBase);
            inicio.setDate(dataBase.getDate() - dataBase.getDay());
            const fim = new Date(inicio);
            fim.setDate(inicio.getDate() + 6);
            return `${inicio.getDate()} a ${fim.getDate()} de ${inicio.toLocaleDateString('pt-BR', { month: 'short' })}, ${inicio.getFullYear()}`;
        }
        return dataBase.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    };

    const handleEditarTarefa = (id: string) => {
        setTarefaSelecionada(null); // Fecha o modal de detalhe
        setTarefaEdicaoId(id);      // Seta o ID da em edição
        setIsModalAddOpen(true);    // Abre o modal de form
    };

    return (
        <div className="flex flex-col h-[calc(100vh-2rem)] md:h-[calc(100vh-4rem)] max-w-[1400px] mx-auto gap-4">

            {/* HEADER DO CALENDÁRIO */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface p-4 rounded-2xl shadow-lg border border-slate-700/50">

                {/* Lado Esquerdo - Controles de Data e Navegação */}
                <div className="flex items-center gap-4">
                    <div className="flex rounded-lg overflow-hidden border border-slate-600 bg-slate-800">
                        <button onClick={() => navegarTempo(-1)} className="px-3 py-1.5 hover:bg-slate-700 hover:text-primary transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <button onClick={irParaHoje} className="px-4 py-1.5 font-medium border-x border-slate-600 hover:bg-slate-700 hover:text-white transition-colors">
                            Hoje
                        </button>
                        <button onClick={() => navegarTempo(1)} className="px-3 py-1.5 hover:bg-slate-700 hover:text-primary transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </button>
                    </div>
                    <h2 className="text-xl md:text-2xl font-bold text-white capitalize m-0 tracking-tight">
                        {formatHeaderDate()}
                    </h2>
                </div>

                {/* Lado Direito - Filtros e Alteração de Visão */}
                <div className="flex items-center gap-3">

                    {isAdmin && (
                        <select
                            value={filtroColaborador}
                            onChange={(e) => setFiltroColaborador(e.target.value)}
                            className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 focus:ring-primary focus:border-primary w-48"
                        >
                            <option value="">Todos os Colaboradores</option>
                            {colaboradores.map(c => (
                                <option key={c.id} value={c.id}>{c.nome}</option>
                            ))}
                        </select>
                    )}

                    <div className="flex rounded-lg overflow-hidden border border-slate-600 bg-slate-800">
                        {(['mes', 'semana', 'dia'] as VisaoCalendario[]).map(v => (
                            <button
                                key={v}
                                onClick={() => setVisao(v)}
                                className={`
                  px-3 py-1.5 text-sm font-medium capitalize transition-all
                  ${v !== 'dia' ? 'border-r border-slate-600' : ''}
                  ${visao === v ? 'bg-primary text-white shadow-inner' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'}
                `}
                            >
                                {v}
                            </button>
                        ))}
                    </div>

                    {isAdmin && (
                        <button
                            onClick={() => {
                                setTarefaEdicaoId(null);
                                setIsModalAddOpen(true);
                            }}
                            className="btn-primary py-1.5 px-4 text-sm font-bold flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                            Nova Tarefa
                        </button>
                    )}
                </div>
            </div>

            {/* CORPO DO CALENDÁRIO */}
            <div className="flex-1 overflow-hidden relative rounded-2xl">
                {loading && (
                    <div className="absolute inset-0 bg-surface/50 backdrop-blur-sm flex items-center justify-center z-10 transition-opacity">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                    </div>
                )}
                <CalendarGrid
                    tarefas={tarefas}
                    etapas={etapas}
                    visao={visao}
                    dataBase={dataBase}
                    onTarefaClick={(tarefa) => setTarefaSelecionada(tarefa)}
                />
            </div>

            {/* FOOTER DA PÁGINA COM LEGENDA */}
            <div className="flex items-center justify-center gap-6 mt-2 pb-4 text-xs font-medium text-slate-400">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-purple-500/50 border border-purple-500 shadow-sm shadow-purple-500/20"></div>
                    <span>Tarefas</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500/50 border border-blue-500 shadow-sm shadow-blue-500/20"></div>
                    <span>Projetos e Etapas</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500/50 border border-green-500 shadow-sm shadow-green-500/20"></div>
                    <span>Concluídas</span>
                </div>
            </div>

            {/* Modais reais */}
            <TarefaModal
                isOpen={isModalAddOpen}
                onClose={() => {
                    setIsModalAddOpen(false);
                    setTarefaEdicaoId(null);
                    carregarDados();
                }}
                tarefaId={tarefaEdicaoId}
            />

            <TarefaDetalheModal
                isOpen={!!tarefaSelecionada}
                onClose={() => {
                    setTarefaSelecionada(null);
                    carregarDados();
                }}
                tarefa={tarefaSelecionada}
                isAdmin={isAdmin}
                userId={user?.id}
                colaboradores={colaboradores}
                onEditarClick={handleEditarTarefa}
            />

        </div>
    );
};

export default CalendarioPage;
