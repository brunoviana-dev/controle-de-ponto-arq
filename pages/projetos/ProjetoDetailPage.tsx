import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getProjetoById } from '../../services/projetosService';
import { createEtapa, deleteEtapa, getEtapasByProjeto, updateEtapa } from '../../services/projetoEtapasService';
import { getColaboradores } from '../../services/colaboradorService';
import { Colaborador, Projeto, ProjetoEtapa } from '../../services/interfaces/types';
import { formatCurrency, formatStatus, getStatusBadgeClass } from '../../utils/formatters';

import { gerarEUploadContrato } from '../../services/contratoService';

const ProjetoDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [projeto, setProjeto] = useState<Projeto | null>(null);
    const [etapas, setEtapas] = useState<ProjetoEtapa[]>([]);
    const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [generatingContract, setGeneratingContract] = useState(false);

    // ... (rest of states)

    const handleGerarContrato = async () => {
        if (!id) return;
        try {
            setGeneratingContract(true);
            const downloadUrl = await gerarEUploadContrato(id);

            // Download automático
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.setAttribute('download', `Contrato_${projeto?.nomeProjeto || 'Projeto'}.docx`);
            document.body.appendChild(link);
            link.click();
            link.remove();

            alert('Contrato gerado com sucesso!');
        } catch (err: any) {
            alert('Erro ao gerar contrato: ' + err.message);
        } finally {
            setGeneratingContract(false);
        }
    };

    // Quick add stage state
    const [showAddForm, setShowAddForm] = useState(false);
    const [newEtapa, setNewEtapa] = useState({
        nomeEtapa: '',
        dataInicioPrevista: '',
        dataFimPrevista: '',
        colaboradorId: ''
    });
    const [savingEtapa, setSavingEtapa] = useState(false);

    // Editing stage state
    const [editingEtapaId, setEditingEtapaId] = useState<string | null>(null);
    const [editValues, setEditValues] = useState({
        nomeEtapa: '',
        dataInicioPrevista: '',
        dataFimPrevista: '',
        colaboradorId: ''
    });

    useEffect(() => {
        if (id) {
            loadData(id);
        }
    }, [id]);

    const loadData = async (projetoId: string) => {
        try {
            setLoading(true);
            const [projetoData, etapasData, colaboradoresData] = await Promise.all([
                getProjetoById(projetoId),
                getEtapasByProjeto(projetoId),
                getColaboradores()
            ]);

            if (projetoData) {
                setProjeto(projetoData);
                setEtapas(etapasData);
                setColaboradores(colaboradoresData);
            } else {
                setError('Projeto não encontrado');
            }
        } catch (err: any) {
            setError(err.message || 'Erro ao carregar dados do projeto');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateEtapa = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newEtapa.nomeEtapa.trim() || !id) return;

        try {
            setSavingEtapa(true);
            await createEtapa({
                projetoId: id,
                nomeEtapa: newEtapa.nomeEtapa,
                ordem: etapas.length + 1,
                dataInicioPrevista: newEtapa.dataInicioPrevista || undefined,
                dataFimPrevista: newEtapa.dataFimPrevista || undefined,
                status: 'nao_iniciado',
                colaboradorId: newEtapa.colaboradorId || undefined
            });
            setNewEtapa({ nomeEtapa: '', dataInicioPrevista: '', dataFimPrevista: '', colaboradorId: '' });
            setShowAddForm(false);

            // Refresh everything to get new status and stages
            await loadData(id);
        } catch (err: any) {
            alert(err.message || 'Erro ao criar etapa');
        } finally {
            setSavingEtapa(false);
        }
    };

    const handleStartEdit = (etapa: ProjetoEtapa) => {
        setEditingEtapaId(etapa.id);
        setEditValues({
            nomeEtapa: etapa.nomeEtapa,
            dataInicioPrevista: etapa.dataInicioPrevista || '',
            dataFimPrevista: etapa.dataFimPrevista || '',
            colaboradorId: etapa.colaboradorId || ''
        });
    };

    const handleSaveEdit = async (etapaId: string) => {
        if (!editValues.nomeEtapa.trim()) {
            alert('O nome da etapa não pode estar vazio.');
            return;
        }
        try {
            const novoStatus = await updateEtapa(etapaId, {
                nomeEtapa: editValues.nomeEtapa,
                dataInicioPrevista: editValues.dataInicioPrevista || undefined,
                dataFimPrevista: editValues.dataFimPrevista || undefined,
                colaboradorId: editValues.colaboradorId || undefined
            });

            // Reload etapas to get the joined collaborator name correctly
            const etapasData = await getEtapasByProjeto(id!);
            setEtapas(etapasData);

            setEditingEtapaId(null);

            // Update project status in local state
            if (projeto) setProjeto({ ...projeto, status: novoStatus });
        } catch (err: any) {
            alert('Erro ao atualizar etapa');
        }
    };

    const handleStatusChange = async (etapaId: string, newStatus: ProjetoEtapa['status']) => {
        try {
            const novoStatus = await updateEtapa(etapaId, { status: newStatus });
            setEtapas(etapas.map(e => e.id === etapaId ? { ...e, status: newStatus } : e));

            // Update project status in local state
            if (projeto) setProjeto({ ...projeto, status: novoStatus });
        } catch (err: any) {
            alert('Erro ao atualizar status');
        }
    };

    const handleDeleteEtapa = async (etapaId: string) => {
        if (!window.confirm('Tem certeza que deseja excluir esta etapa?')) return;
        try {
            const novoStatus = await deleteEtapa(etapaId);
            setEtapas(etapas.filter(e => e.id !== etapaId));

            // Update project status in local state
            if (projeto) setProjeto({ ...projeto, status: novoStatus });
        } catch (err: any) {
            alert('Erro ao excluir etapa');
        }
    };

    if (loading) return <div className="p-6 text-slate-300">Carregando...</div>;
    if (error || !projeto) return (
        <div className="p-6">
            <div className="bg-red-500/10 border border-red-500 text-red-500 p-4 rounded-md">
                {error || 'Projeto não encontrado'}
            </div>
            <Link to="/projetos" className="inline-block mt-4 text-primary hover:underline">
                &larr; Voltar para Projetos
            </Link>
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                    <Link to={`/clientes/${projeto.clienteId}`} className="text-slate-400 hover:text-white">
                        &larr; Voltar para Cliente
                    </Link>
                    <h1 className="text-2xl font-bold text-white mb-0">{projeto.nomeProjeto}</h1>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleGerarContrato}
                        disabled={generatingContract}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-md transition duration-200 flex items-center gap-2 disabled:opacity-50"
                    >
                        {generatingContract ? (
                            <>
                                <div className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full"></div>
                                <span>Gerando...</span>
                            </>
                        ) : (
                            <>
                                <span>📄</span>
                                Gerar Contrato
                            </>
                        )}
                    </button>
                    <Link
                        to={`/projetos/${projeto.id}/editar`}
                        className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-md transition duration-200"
                    >
                        Editar Projeto
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Info Card */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-surface p-6 rounded-lg border border-slate-700">
                        <h2 className="text-lg font-semibold text-white mb-4 border-b border-slate-700 pb-2">Informações</h2>
                        <div className="space-y-4 text-sm">
                            <div>
                                <span className="block text-slate-500 mb-1">Cliente</span>
                                {projeto.cliente ? (
                                    <Link to={`/clientes/${projeto.clienteId}`} className="text-primary hover:underline font-medium">
                                        {projeto.cliente.nome}
                                    </Link>
                                ) : (
                                    <span className="text-white font-medium">Cliente não vinculado</span>
                                )}
                            </div>
                            <div>
                                <span className="block text-slate-500 mb-1">Empresa</span>
                                <span className="text-white font-medium">{projeto.empresa || '-'}</span>
                            </div>
                            <div>
                                <span className="block text-slate-500 mb-1">Tipo do Projeto</span>
                                <span className="text-white font-medium">{projeto.projetoTipo?.nome || 'Não definido'}</span>
                            </div>
                            <div>
                                <span className="block text-slate-500 mb-1">Status do Projeto</span>
                                <span className={`px-2 py-0.5 rounded text-xs inline-block font-medium ${getStatusBadgeClass(projeto.status)}`}>
                                    {formatStatus(projeto.status)}
                                </span>
                            </div>
                            <div>
                                <span className="block text-slate-500 mb-1">Endereço da Obra</span>
                                <span className="text-white font-medium leading-relaxed">
                                    {projeto.enderecoObra || '-'}
                                </span>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <span className="block text-slate-500 mb-1">Data Início</span>
                                    <span className="text-white font-medium">{projeto.dataInicio || '-'}</span>
                                </div>
                                <div>
                                    <span className="block text-slate-500 mb-1">Previsão Término</span>
                                    <span className="text-white font-medium">{projeto.dataPrevistaTermino || '-'}</span>
                                </div>
                            </div>
                            <div>
                                <span className="block text-slate-500 mb-1">Observações</span>
                                <p className="text-slate-300 whitespace-pre-wrap leading-relaxed">
                                    {projeto.observacoes || 'Nenhuma observação.'}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-surface p-6 rounded-lg border border-slate-700">
                        <h2 className="text-lg font-semibold text-white mb-4 border-b border-slate-700 pb-2">Informações de Pagamento</h2>
                        <div className="space-y-4 text-sm">
                            <div>
                                <span className="block text-slate-500 mb-1">Valor</span>
                                <span className="text-white font-medium">{formatCurrency(projeto.valor)}</span>
                            </div>
                            <div>
                                <span className="block text-slate-500 mb-1">Forma de Pagamento</span>
                                <span className="text-white font-medium">{projeto.formaPagamento || 'Não informado'}</span>
                            </div>
                            <div>
                                <span className="block text-slate-500 mb-1">Nº de Prestações</span>
                                <span className="text-white font-medium">
                                    {projeto.numeroPrestacoes === 0 ? 'À vista' :
                                        !projeto.numeroPrestacoes ? 'Não informado' :
                                            projeto.numeroPrestacoes === 1 ? '1 vez' :
                                                `${projeto.numeroPrestacoes} vezes`}
                                </span>
                            </div>
                            {projeto.dataPrimeiroVencimento && (
                                <div>
                                    <span className="block text-slate-500 mb-1">1º Vencimento</span>
                                    <span className="text-white font-medium">{projeto.dataPrimeiroVencimento}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Stages Card */}
                <div className="lg:col-span-3">
                    <div className="bg-surface rounded-lg border border-slate-700 overflow-hidden">
                        <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800/30">
                            <h2 className="text-lg font-semibold text-white">Etapas</h2>
                            <button
                                onClick={() => setShowAddForm(!showAddForm)}
                                className="bg-primary hover:bg-primary-dark text-white text-xs px-3 py-1.5 rounded transition duration-200"
                            >
                                {showAddForm ? 'Cancelar' : '+ Nova Etapa'}
                            </button>
                        </div>

                        {showAddForm && (
                            <div className="p-4 bg-slate-800/50 border-b border-slate-700">
                                <form onSubmit={handleCreateEtapa} className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                        <div className="md:col-span-1">
                                            <label className="block text-xs text-slate-500 mb-1">Nome da Etapa</label>
                                            <input
                                                type="text"
                                                value={newEtapa.nomeEtapa}
                                                onChange={e => setNewEtapa({ ...newEtapa, nomeEtapa: e.target.value })}
                                                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white text-sm focus:border-primary outline-none"
                                                placeholder="Ex: Fundação"
                                                autoFocus
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-slate-500 mb-1">Início Previsto</label>
                                            <input
                                                type="date"
                                                value={newEtapa.dataInicioPrevista}
                                                onChange={e => setNewEtapa({ ...newEtapa, dataInicioPrevista: e.target.value })}
                                                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white text-sm focus:border-primary outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-slate-500 mb-1">Fim Previsto</label>
                                            <input
                                                type="date"
                                                value={newEtapa.dataFimPrevista}
                                                onChange={e => setNewEtapa({ ...newEtapa, dataFimPrevista: e.target.value })}
                                                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white text-sm focus:border-primary outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-slate-500 mb-1">Responsável</label>
                                            <select
                                                value={newEtapa.colaboradorId}
                                                onChange={e => setNewEtapa({ ...newEtapa, colaboradorId: e.target.value })}
                                                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white text-sm focus:border-primary outline-none"
                                            >
                                                <option value="">Sem responsável</option>
                                                {colaboradores.map(c => (
                                                    <option key={c.id} value={c.id}>{c.nome}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="flex justify-end">
                                        <button
                                            type="submit"
                                            disabled={savingEtapa}
                                            className="bg-primary hover:bg-primary-dark text-white text-xs px-4 py-2 rounded transition duration-200"
                                        >
                                            {savingEtapa ? 'Salvando...' : 'Salvar Etapa'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-slate-300">
                                <thead className="bg-slate-800/50 text-slate-500 uppercase font-medium text-[11px] tracking-wider">
                                    <tr>
                                        <th className="px-6 py-3">Etapa</th>
                                        <th className="px-6 py-3">Datas</th>
                                        <th className="px-6 py-3">Responsável</th>
                                        <th className="px-6 py-3 text-center">Status</th>
                                        <th className="px-6 py-3 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700/50">
                                    {etapas.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-8 text-center text-slate-500 italic">
                                                Nenhuma etapa cadastrada para este projeto.
                                            </td>
                                        </tr>
                                    ) : (
                                        etapas.map((etapa) => (
                                            <tr key={etapa.id} className="hover:bg-slate-800/20 transition-colors">
                                                <td className="px-6 py-4">
                                                    {editingEtapaId === etapa.id ? (
                                                        <input
                                                            type="text"
                                                            value={editValues.nomeEtapa}
                                                            onChange={e => setEditValues({ ...editValues, nomeEtapa: e.target.value })}
                                                            className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-sm w-full outline-none focus:border-primary"
                                                        />
                                                    ) : (
                                                        <span className="font-medium text-white">{etapa.nomeEtapa}</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-xs whitespace-nowrap">
                                                    {editingEtapaId === etapa.id ? (
                                                        <div className="space-y-1">
                                                            <input
                                                                type="date"
                                                                value={editValues.dataInicioPrevista}
                                                                onChange={e => setEditValues({ ...editValues, dataInicioPrevista: e.target.value })}
                                                                className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-[10px] w-full"
                                                            />
                                                            <input
                                                                type="date"
                                                                value={editValues.dataFimPrevista}
                                                                onChange={e => setEditValues({ ...editValues, dataFimPrevista: e.target.value })}
                                                                className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-[10px] w-full"
                                                            />
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-0.5">
                                                            <div className="text-slate-500">Início: <span className="text-slate-300">{etapa.dataInicioPrevista || '-'}</span></div>
                                                            <div className="text-slate-500">Fim: <span className="text-slate-300">{etapa.dataFimPrevista || '-'}</span></div>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {editingEtapaId === etapa.id ? (
                                                        <select
                                                            value={editValues.colaboradorId}
                                                            onChange={e => setEditValues({ ...editValues, colaboradorId: e.target.value })}
                                                            className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white outline-none focus:border-primary w-full"
                                                        >
                                                            <option value="">Sem responsável</option>
                                                            {colaboradores.map(c => (
                                                                <option key={c.id} value={c.id}>{c.nome}</option>
                                                            ))}
                                                        </select>
                                                    ) : (
                                                        <span className="text-slate-300">
                                                            {etapa.colaborador?.nome || '-'}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-center whitespace-nowrap">
                                                    {editingEtapaId === etapa.id ? (
                                                        <select
                                                            value={etapa.status}
                                                            onChange={(e) => handleStatusChange(etapa.id, e.target.value as ProjetoEtapa['status'])}
                                                            className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white outline-none focus:border-primary"
                                                        >
                                                            <option value="nao_iniciado">Não Iniciado</option>
                                                            <option value="em_andamento">Em Andamento</option>
                                                            <option value="concluido">Concluído</option>
                                                            <option value="cancelado">Cancelado</option>
                                                        </select>
                                                    ) : (
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${getStatusBadgeClass(etapa.status)}`}>
                                                            {formatStatus(etapa.status)}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        {editingEtapaId === etapa.id ? (
                                                            <>
                                                                <button onClick={() => handleSaveEdit(etapa.id)} className="text-emerald-500 hover:text-emerald-400 text-xs font-medium">Salvar</button>
                                                                <button onClick={() => setEditingEtapaId(null)} className="text-slate-500 hover:text-slate-400 text-xs font-medium border border-slate-500/30 px-2 py-1 rounded">Cancelar</button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <button onClick={() => handleStartEdit(etapa)} className="text-amber-500 hover:text-amber-400 text-xs font-medium border border-amber-500/30 px-2 py-1 rounded hover:bg-amber-500/10">Editar</button>
                                                                <button onClick={() => handleDeleteEtapa(etapa.id)} className="text-red-500 hover:text-red-400 text-xs font-medium border border-red-500/30 px-2 py-1 rounded hover:bg-red-500/10">Excluir</button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProjetoDetailPage;
