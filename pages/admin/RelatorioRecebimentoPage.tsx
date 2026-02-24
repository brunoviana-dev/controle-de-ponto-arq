import React, { useEffect, useState } from 'react';
import { RelatorioRecebimento, ProjetoParcela } from '../../services/interfaces/types';
import { getRelatorioRecebimento, getParcelasProjeto, registrarPagamentoMultiplasParcelas } from '../../services/projetoParcelasService';
import { formatCurrency } from '../../utils/formatters';

const RelatorioRecebimentoPage: React.FC = () => {
    const [relatorios, setRelatorios] = useState<RelatorioRecebimento[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [processingId, setProcessingId] = useState<string | null>(null);

    // Estados para o Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedRel, setSelectedRel] = useState<RelatorioRecebimento | null>(null);
    const [parcelas, setParcelas] = useState<ProjetoParcela[]>([]);
    const [selectedParcelaIds, setSelectedParcelaIds] = useState<Set<string>>(new Set());
    const [modalLoading, setModalLoading] = useState(false);

    const fetchData = async () => {
        try {
            setLoading(true);
            const data = await getRelatorioRecebimento();
            setRelatorios(data);
            setError(null);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleOpenModal = async (rel: RelatorioRecebimento) => {
        try {
            setSelectedRel(rel);
            setModalLoading(true);
            setIsModalOpen(true);
            setSelectedParcelaIds(new Set());
            const data = await getParcelasProjeto(rel.projetoId);
            setParcelas(data);
        } catch (err: any) {
            alert(err.message);
            setIsModalOpen(false);
        } finally {
            setModalLoading(false);
        }
    };

    const toggleParcela = (id: string) => {
        const next = new Set(selectedParcelaIds);
        if (next.has(id)) {
            next.delete(id);
        } else {
            next.add(id);
        }
        setSelectedParcelaIds(next);
    };

    const handleConcluir = async () => {
        if (selectedParcelaIds.size === 0) {
            alert('Selecione pelo menos uma parcela para receber.');
            return;
        }

        try {
            setProcessingId(selectedRel?.projetoId || null);
            await registrarPagamentoMultiplasParcelas(Array.from(selectedParcelaIds));
            setIsModalOpen(false);
            await fetchData();
        } catch (err: any) {
            alert(err.message);
        } finally {
            setProcessingId(null);
        }
    };

    if (loading && relatorios.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Relatório de Recebimento</h1>
                    <p className="text-slate-400">Controle financeiro e fluxo de caixa por projeto</p>
                </div>
                <button
                    onClick={fetchData}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md transition-colors border border-slate-600 flex items-center gap-2"
                >
                    <span>🔄</span> Atualizar
                </button>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500 text-red-500 p-4 rounded-md">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {relatorios.map((rel) => (
                    <div key={rel.projetoId} className="bg-surface border border-slate-700 rounded-xl p-6 hover:border-slate-500 transition-all shadow-lg">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-lg font-bold text-white">{rel.nomeProjeto}</h3>
                                <p className="text-sm text-primary font-medium">{rel.clienteNome}</p>
                            </div>
                            {rel.todasPagas ? (
                                <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500 text-emerald-500 text-xs font-bold rounded-full uppercase">
                                    Quitado
                                </span>
                            ) : (
                                <span className="px-3 py-1 bg-amber-500/10 border border-amber-500 text-amber-500 text-xs font-bold rounded-full uppercase">
                                    Em Aberto
                                </span>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="bg-background/50 p-3 rounded-lg border border-slate-800">
                                <p className="text-xs text-slate-500 uppercase font-bold mb-1">Valor Total</p>
                                <p className="text-white font-bold">{formatCurrency(rel.valorTotal)}</p>
                            </div>
                            <div className="bg-background/50 p-3 rounded-lg border border-slate-800">
                                <p className="text-xs text-slate-500 uppercase font-bold mb-1">Parcelas</p>
                                <p className="text-white font-bold">{rel.parcelasRecebidas} / {rel.numeroParcelas}</p>
                            </div>
                            <div className="bg-background/50 p-3 rounded-lg border border-slate-800">
                                <p className="text-xs text-slate-500 uppercase font-bold mb-1">Recebido</p>
                                <p className="text-emerald-500 font-bold">{formatCurrency(rel.valorRecebido)}</p>
                            </div>
                            <div className="bg-background/50 p-3 rounded-lg border border-slate-800">
                                <p className="text-xs text-slate-500 uppercase font-bold mb-1">Em Aberto</p>
                                <p className="text-rose-500 font-bold">{formatCurrency(rel.valorEmAberto)}</p>
                            </div>
                        </div>

                        {/* Barra de Progresso */}
                        <div className="mb-6">
                            <div className="flex justify-between text-xs mb-1">
                                <span className="text-slate-400">Progresso do Recebimento</span>
                                <span className="text-white font-bold">
                                    {rel.numeroParcelas > 0 ? Math.round((rel.parcelasRecebidas / rel.numeroParcelas) * 100) : 0}%
                                </span>
                            </div>
                            <div className="w-full bg-slate-800 rounded-full h-2">
                                <div
                                    className="bg-primary h-2 rounded-full transition-all duration-500"
                                    style={{ width: `${rel.numeroParcelas > 0 ? (rel.parcelasRecebidas / rel.numeroParcelas) * 100 : 0}%` }}
                                ></div>
                            </div>
                        </div>

                        {!rel.todasPagas && (
                            <button
                                onClick={() => handleOpenModal(rel)}
                                disabled={processingId === rel.projetoId}
                                className="w-full py-3 bg-primary hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                            >
                                {processingId === rel.projetoId ? (
                                    <>
                                        <div className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full"></div>
                                        <span>Processando...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>💰</span> Receber
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                ))}

                {relatorios.length === 0 && !loading && (
                    <div className="col-span-full py-20 text-center bg-surface border border-dashed border-slate-700 rounded-xl">
                        <span className="text-4xl mb-4 block">📁</span>
                        <p className="text-slate-400">Nenhum projeto com parcelas encontrado.</p>
                    </div>
                )}
            </div>

            {/* Modal de Recebimento */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-surface border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-slate-700">
                            <h2 className="text-xl font-bold text-white">Receber Prestações</h2>
                            <p className="text-sm text-slate-400">{selectedRel?.nomeProjeto}</p>
                        </div>

                        <div className="p-6 max-h-[400px] overflow-y-auto">
                            {modalLoading ? (
                                <div className="flex justify-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary"></div>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {parcelas.map((par) => (
                                        <div
                                            key={par.id}
                                            onClick={() => par.status === 'pendente' && toggleParcela(par.id)}
                                            className={`flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer ${par.status === 'recebido'
                                                ? 'bg-emerald-500/5 border-emerald-500/20 opacity-60 cursor-not-allowed'
                                                : selectedParcelaIds.has(par.id)
                                                    ? 'bg-primary/10 border-primary shadow-inner shadow-primary/10'
                                                    : 'bg-slate-800/50 border-slate-700 hover:border-slate-500'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${par.status === 'recebido'
                                                    ? 'bg-emerald-500 border-emerald-500'
                                                    : selectedParcelaIds.has(par.id)
                                                        ? 'bg-primary border-primary'
                                                        : 'border-slate-500'
                                                    }`}>
                                                    {(par.status === 'recebido' || selectedParcelaIds.has(par.id)) && (
                                                        <span className="text-white text-[10px] font-bold">✓</span>
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-white text-base">Parcela {par.numeroParcela}</p>
                                                    <p className="text-xs text-slate-400">
                                                        {par.status === 'recebido'
                                                            ? `Recebida em ${par.dataRecebimento ? new Date(par.dataRecebimento).toLocaleDateString('pt-BR') : 'data não informada'}`
                                                            : 'Aguardando pagamento'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-white text-lg">{formatCurrency(par.valorParcela)}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="p-6 bg-slate-800/50 border-t border-slate-700 flex gap-3">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="flex-1 py-3 px-4 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleConcluir}
                                disabled={selectedParcelaIds.size === 0 || processingId !== null}
                                className="flex-2 py-3 px-6 bg-primary hover:bg-primary-dark disabled:opacity-50 text-white font-bold rounded-xl transition-all shadow-lg shadow-primary/20"
                            >
                                {processingId ? 'Processando...' : `Concluir (${selectedParcelaIds.size})`}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RelatorioRecebimentoPage;

