import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { contasPagarService } from '../../services/contasPagarService';
import { ContaPagar } from '../../services/interfaces/types';
import ConfirmModal from '../../components/ConfirmModal';

const ContasPagarPage: React.FC = () => {
    const [contas, setContas] = useState<ContaPagar[]>([]);
    const [loading, setLoading] = useState(true);
    const [mes, setMes] = useState(new Date().getMonth() + 1);
    const [ano, setAno] = useState(new Date().getFullYear());
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [contaToDelete, setContaToDelete] = useState<string | null>(null);
    const navigate = useNavigate();

    const loadContas = async () => {
        setLoading(true);
        try {
            const data = await contasPagarService.getContasPorMes(mes, ano);
            setContas(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadContas();
    }, [mes, ano]);

    const handleDelete = async () => {
        if (!contaToDelete) return;
        try {
            await contasPagarService.deleteConta(contaToDelete);
            loadContas();
            setShowDeleteModal(false);
        } catch (error) {
            console.error(error);
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    };

    const formatDate = (dateStr: string) => {
        const [year, month, day] = dateStr.split('-');
        return `${day}/${month}/${year}`;
    };

    const totalValor = contas.reduce((acc, curr) => acc + (curr.valor || 0), 0);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Contas a Pagar</h1>
                    <p className="text-slate-400 mt-1">Gerenciamento de compromissos financeiros</p>
                </div>
                <button
                    onClick={() => navigate('novo')}
                    className="bg-primary hover:bg-primary-dark text-white px-6 py-2.5 rounded-lg font-bold transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                >
                    <span className="text-xl">+</span> Nova Conta
                </button>
            </div>

            {/* Filtros e Resumo */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-3 bg-surface p-6 rounded-xl border border-slate-700 shadow-xl flex flex-wrap items-center gap-6">
                    <div className="flex items-center gap-3">
                        <label className="text-sm font-medium text-slate-400">Mês:</label>
                        <select
                            value={mes}
                            onChange={(e) => setMes(Number(e.target.value))}
                            className="bg-slate-800 border border-slate-600 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                        >
                            {Array.from({ length: 12 }, (_, i) => (
                                <option key={i + 1} value={i + 1}>
                                    {new Date(0, i).toLocaleString('pt-BR', { month: 'long' })}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center gap-3">
                        <label className="text-sm font-medium text-slate-400">Ano:</label>
                        <select
                            value={ano}
                            onChange={(e) => setAno(Number(e.target.value))}
                            className="bg-slate-800 border border-slate-600 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                        >
                            {[ano - 1, ano, ano + 1].map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="bg-primary/10 border border-primary/20 p-6 rounded-xl shadow-xl flex flex-col justify-center">
                    <span className="text-slate-400 text-sm font-medium">Total do Período</span>
                    <span className="text-2xl font-bold text-primary mt-1">{formatCurrency(totalValor)}</span>
                </div>
            </div>

            {/* Tabela */}
            <div className="bg-surface rounded-xl border border-slate-700 shadow-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-800/50 border-b border-slate-700">
                                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Descrição</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Categoria</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider text-center">Vencimento</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">Valor</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider text-center">Recorrente</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                                            <span>Carregando contas...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : contas.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                        Nenhuma conta encontrada para este período.
                                    </td>
                                </tr>
                            ) : (
                                contas.map((conta) => (
                                    <tr key={conta.id} className="hover:bg-slate-800/30 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-white">{conta.descricao}</div>
                                            {conta.observacoes && (
                                                <div className="text-xs text-slate-500 mt-1 line-clamp-1">{conta.observacoes}</div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 text-xs border border-slate-600">
                                                {conta.categoria || 'Geral'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center text-slate-300 truncate font-mono">
                                            {formatDate(conta.data_vencimento)}
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-white">
                                            {formatCurrency(conta.valor)}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {conta.recorrente ? (
                                                <span className="text-emerald-500 text-lg" title="Recorrente">🔄</span>
                                            ) : (
                                                <span className="text-slate-600">—</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right space-x-2">
                                            <button
                                                onClick={() => navigate(`${conta.id}/editar`)}
                                                className="p-2 text-slate-500 hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                                                title="Editar"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setContaToDelete(conta.id);
                                                    setShowDeleteModal(true);
                                                }}
                                                className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                                title="Excluir"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <ConfirmModal
                isOpen={showDeleteModal}
                title="Excluir Conta"
                message="Tem certeza que deseja excluir esta conta? Esta ação não pode ser desfeita."
                onConfirm={handleDelete}
                onCancel={() => setShowDeleteModal(false)}
            />
        </div>
    );
};

export default ContasPagarPage;
