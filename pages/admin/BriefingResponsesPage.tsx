import React, { useEffect, useState } from 'react';
import { BriefingResposta, BriefingStatus } from '../../services/interfaces/types';
import { briefingRespostasService } from '../../services/briefingRespostasService';
import { briefingPerguntasService } from '../../services/briefingPerguntasService';
import { getTiposAtivos } from '../../services/projetoTiposService';
import { ProjetoTipo } from '../../services/interfaces/types';
import ConfirmModal from '../../components/ConfirmModal';

const BriefingResponsesPage: React.FC = () => {
    const [respostas, setRespostas] = useState<BriefingResposta[]>([]);
    const [perguntas, setPerguntas] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedResposta, setSelectedResposta] = useState<BriefingResposta | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [tiposProjeto, setTiposProjeto] = useState<ProjetoTipo[]>([]);

    const [activeFilter, setActiveFilter] = useState<BriefingStatus | 'todos'>('todos');
    const [activeTipoFilter, setActiveTipoFilter] = useState<string | 'todos'>('todos');

    const fetchData = async () => {
        try {
            setLoading(true);
            const [respostasData, perguntasData, tiposData] = await Promise.all([
                briefingRespostasService.getRespostas(),
                briefingPerguntasService.getPerguntas(),
                getTiposAtivos()
            ]);

            // Map perguntas ID to text
            const perguntasMap: Record<string, string> = {};
            perguntasData.forEach(p => {
                perguntasMap[p.id] = p.pergunta;
            });

            setRespostas(respostasData);
            setPerguntas(perguntasMap);
            setTiposProjeto(tiposData);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const filteredRespostas = respostas.filter(r => {
        const matchesStatus = activeFilter === 'todos' || r.status === activeFilter;
        const matchesTipo = activeTipoFilter === 'todos' || r.tipo_projeto_id === activeTipoFilter;
        return matchesStatus && matchesTipo;
    });

    const statusCounts = {
        todos: respostas.length,
        novo: respostas.filter(r => r.status === 'novo').length,
        em_contato: respostas.filter(r => r.status === 'em_contato').length,
        convertido: respostas.filter(r => r.status === 'convertido').length,
        descartado: respostas.filter(r => r.status === 'descartado').length,
    };

    const getTipoCount = (tipoId: string | 'todos') => {
        if (tipoId === 'todos') return respostas.length;
        return respostas.filter(r => r.tipo_projeto_id === tipoId).length;
    };

    const handleUpdateStatus = async (id: string, status: BriefingStatus) => {
        try {
            setIsProcessing(true);
            await briefingRespostasService.updateStatus(id, status);
            setRespostas(respostas.map(r => r.id === id ? { ...r, status } : r));
            if (selectedResposta?.id === id) {
                setSelectedResposta({ ...selectedResposta, status });
            }
        } catch (err: any) {
            alert('Erro ao atualizar status: ' + err.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedResposta) return;
        try {
            setIsProcessing(true);

            // 1. Excluir anexos do storage se existirem
            if (selectedResposta.anexos && selectedResposta.anexos.length > 0) {
                await briefingRespostasService.deleteAnexos(selectedResposta.anexos);
            }

            // 2. Excluir registro do banco
            await briefingRespostasService.deleteResposta(selectedResposta.id);

            setRespostas(respostas.filter(r => r.id !== selectedResposta.id));
            setIsConfirmDeleteOpen(false);
            setIsDetailModalOpen(false);
        } catch (err: any) {
            alert('Erro ao deletar resposta: ' + err.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const getStatusBadge = (status: BriefingStatus) => {
        const config = {
            novo: { color: 'bg-blue-500/20 text-blue-400 border-blue-500/20', label: 'Novo' },
            em_contato: { color: 'bg-amber-500/20 text-amber-400 border-amber-500/20', label: 'Em Contato' },
            convertido: { color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20', label: 'Convertido' },
            descartado: { color: 'bg-slate-500/20 text-slate-400 border-slate-500/20', label: 'Descartado' }
        };
        const { color, label } = config[status] || config.novo;
        return (
            <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${color}`}>
                {label}
            </span>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-white">Respostas do Briefing</h1>
                        <p className="text-slate-400">Gerencie os contatos e propostas recebidas pelo formulário público.</p>
                    </div>

                    <div className="flex p-1 bg-slate-800/50 rounded-xl border border-slate-700/50 self-start md:self-auto">
                        {(['todos', 'novo', 'em_contato', 'convertido', 'descartado'] as const).map((filter) => (
                            <button
                                key={filter}
                                onClick={() => setActiveFilter(filter)}
                                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all capitalize flex items-center gap-2 whitespace-nowrap
                                    ${activeFilter === filter
                                        ? 'bg-slate-700 text-white shadow-lg'
                                        : 'text-slate-400 hover:text-white hover:bg-slate-700/30'}
                                `}
                            >
                                {filter.replace('_', ' ')}
                                <span className={`px-1.5 py-0.5 rounded-md text-[10px] 
                                    ${activeFilter === filter ? 'bg-primary/20 text-primary' : 'bg-slate-700 text-slate-400'}
                                `}>
                                    {statusCounts[filter]}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-4 bg-slate-800/50 p-2 rounded-xl border border-slate-700/50 self-start">
                    <span className="text-[10px] font-black text-slate-500 px-2 uppercase tracking-widest pl-4">Filtrar por Projeto:</span>
                    <div className="flex flex-wrap gap-2 pr-2">
                        <button
                            onClick={() => setActiveTipoFilter('todos')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-2
                                ${activeTipoFilter === 'todos'
                                    ? 'bg-primary text-white shadow-lg'
                                    : 'bg-slate-700/50 text-slate-400 hover:text-white hover:bg-slate-700/30'}
                            `}
                        >
                            Todos
                            <span className={`px-1.5 py-0.5 rounded-md text-[10px] 
                                ${activeTipoFilter === 'todos' ? 'bg-white/20' : 'bg-slate-700'}
                            `}>
                                {getTipoCount('todos')}
                            </span>
                        </button>
                        {tiposProjeto.map(t => (
                            <button
                                key={t.id}
                                onClick={() => setActiveTipoFilter(t.id)}
                                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-2
                                    ${activeTipoFilter === t.id
                                        ? 'bg-primary text-white shadow-lg'
                                        : 'bg-slate-700/50 text-slate-400 hover:text-white hover:bg-slate-700/30'}
                                `}
                            >
                                {t.nome}
                                <span className={`px-1.5 py-0.5 rounded-md text-[10px] 
                                    ${activeTipoFilter === t.id ? 'bg-white/20' : 'bg-slate-700'}
                                `}>
                                    {getTipoCount(t.id)}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-lg">
                    {error}
                </div>
            )}

            <div className="bg-surface border border-slate-700 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-800/50 border-b border-slate-700 text-slate-400 uppercase text-xs font-bold">
                            <tr>
                                <th className="px-6 py-4 text-xs">Data</th>
                                <th className="px-6 py-4 text-xs">Cliente</th>
                                <th className="px-6 py-4 text-xs">Tipo de Projeto</th>
                                <th className="px-6 py-4 text-xs font-medium">Contato</th>
                                <th className="px-6 py-4 text-xs">Status</th>
                                <th className="px-6 py-4 text-right text-xs">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50">
                            {filteredRespostas.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                        Nenhuma resposta encontrada para este filtro.
                                    </td>
                                </tr>
                            ) : (
                                filteredRespostas.map((r) => (
                                    <tr key={r.id} className="hover:bg-slate-700/30 transition-colors group">
                                        <td className="px-6 py-4 text-sm text-slate-400">
                                            {new Date(r.created_at || '').toLocaleDateString('pt-BR')}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-semibold text-white">{r.nome}</div>
                                            <div className="text-xs text-slate-500">{r.email}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 bg-slate-800 text-slate-300 text-[10px] font-bold rounded uppercase border border-slate-700">
                                                {(r as any).projeto_tipos?.nome || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-400">
                                            {r.telefone || '-'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <select
                                                value={r.status}
                                                onChange={(e) => handleUpdateStatus(r.id, e.target.value as BriefingStatus)}
                                                disabled={isProcessing}
                                                className={`text-xs font-semibold rounded-full px-2 py-1 border bg-transparent cursor-pointer focus:outline-none transition-all
                                                    ${r.status === 'novo' ? 'text-blue-400 border-blue-500/20 hover:bg-blue-500/10' : ''}
                                                    ${r.status === 'em_contato' ? 'text-amber-400 border-amber-500/20 hover:bg-amber-500/10' : ''}
                                                    ${r.status === 'convertido' ? 'text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10' : ''}
                                                    ${r.status === 'descartado' ? 'text-slate-400 border-slate-500/20 hover:bg-slate-500/10' : ''}
                                                `}
                                            >
                                                <option value="novo" className="bg-slate-800 text-white">Novo</option>
                                                <option value="em_contato" className="bg-slate-800 text-white">Em Contato</option>
                                                <option value="convertido" className="bg-slate-800 text-white">Convertido</option>
                                                <option value="descartado" className="bg-slate-800 text-white">Descartado</option>
                                            </select>
                                        </td>
                                        <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                                            <button
                                                onClick={() => {
                                                    setSelectedResposta(r);
                                                    setIsDetailModalOpen(true);
                                                }}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-all border border-blue-500/20 text-xs font-bold"
                                            >
                                                Ver
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setSelectedResposta(r);
                                                    setIsConfirmDeleteOpen(true);
                                                }}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs font-bold rounded-lg transition-all"
                                            >
                                                Deletar
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal de Detalhes */}
            {isDetailModalOpen && selectedResposta && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-surface border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
                        {/* Header do Modal */}
                        <div className="p-6 border-b border-slate-700 flex justify-between items-start bg-slate-800/50">
                            <div>
                                <h2 className="text-xl font-bold text-white">{selectedResposta.nome}</h2>
                                <p className="text-slate-400 text-sm mt-1">{selectedResposta.email} • {selectedResposta.telefone}</p>
                            </div>
                            <button
                                onClick={() => setIsDetailModalOpen(false)}
                                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700/50 transition-all font-bold text-xl"
                            >
                                ×
                            </button>
                        </div>

                        {/* Conteúdo do Modal */}
                        <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
                            {/* Status and Project Type */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Status Atual</label>
                                    <div className="flex items-center space-x-2 pt-1">
                                        {getStatusBadge(selectedResposta.status)}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Tipo de Projeto</label>
                                    <p className="text-slate-300 font-medium">
                                        {(selectedResposta as any).projeto_tipos?.nome || 'Não especificado'}
                                    </p>
                                </div>
                            </div>

                            {/* Respostas do Formulário */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-primary uppercase tracking-widest border-l-2 border-primary pl-3">Respostas do Questionário</h3>
                                <div className="space-y-4 bg-slate-800/30 rounded-xl p-4 border border-slate-700/50">
                                    {Object.entries(selectedResposta.respostas).map(([key, value]) => (
                                        <div key={key} className="space-y-1 group">
                                            <p className="text-xs font-bold text-slate-500 uppercase">
                                                {perguntas[key] || "Pergunta Não Encontrada / Técnica"}
                                            </p>
                                            <div className="text-white text-sm bg-slate-900/40 p-2 rounded border border-slate-700/30 group-hover:border-slate-600 transition-colors">
                                                {Array.isArray(value) ? value.join(', ') : String(value)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Anexos */}
                            {selectedResposta.anexos && selectedResposta.anexos.length > 0 && (
                                <div className="space-y-4 text-left">
                                    <h3 className="text-sm font-bold text-primary uppercase tracking-widest border-l-2 border-primary pl-3">Arquivos Anexados</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {selectedResposta.anexos.map((anexo, idx) => (
                                            <a
                                                key={idx}
                                                href={anexo.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center p-3 bg-slate-800/50 border border-slate-700 rounded-lg hover:border-primary/50 hover:bg-primary/5 transition-all group"
                                            >
                                                <span className="text-2xl mr-3 group-hover:scale-110 transition-transform">
                                                    {anexo.tipo.includes('pdf') ? '📄' : '🖼️'}
                                                </span>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-medium text-white truncate">{anexo.nome}</p>
                                                    <p className="text-[10px] text-slate-500">{(anexo.tamanho / 1024 / 1024).toFixed(2)} MB</p>
                                                </div>
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer do Modal */}
                        <div className="p-6 border-t border-slate-700 bg-slate-800/50 flex justify-end">
                            <button
                                onClick={() => setIsDetailModalOpen(false)}
                                className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-bold rounded-lg transition-all"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmModal
                isOpen={isConfirmDeleteOpen}
                onClose={() => setIsConfirmDeleteOpen(false)}
                onConfirm={handleDelete}
                title="Excluir Resposta"
                message="Tem certeza que deseja excluir esta resposta? Esta ação não pode ser desfeita."
                confirmText="Sim, Excluir"
                cancelText="Cancelar"
            />
        </div >
    );
};

export default BriefingResponsesPage;
