import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { createProjeto, getProjetoById, updateProjeto } from '../../services/projetosService';
import { getClientes } from '../../services/clientesService';
import { createEtapa } from '../../services/projetoEtapasService';
import { getColaboradores } from '../../services/colaboradorService';
import { Cliente, Colaborador, ProjetoEtapa } from '../../services/interfaces/types';

interface EtapaInput {
    idTemp?: string;
    nomeEtapa: string;
    dataInicioPrevista: string;
    dataFimPrevista: string;
    colaboradorId: string;
}

const ProjetoFormPage: React.FC = () => {
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const preSelectedClienteId = searchParams.get('clienteId');
    const isEditing = !!id;
    const navigate = useNavigate();

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);

    // Etapas state
    const [etapas, setEtapas] = useState<EtapaInput[]>([]);

    const [formData, setFormData] = useState({
        clienteId: preSelectedClienteId || '',
        nomeProjeto: '',
        empresa: '',
        enderecoObra: '',
        dataInicio: '',
        dataPrevistaTermino: '',
        status: 'planejamento',
        observacoes: ''
    });

    useEffect(() => {
        loadDependencies();
    }, []);

    const loadDependencies = async () => {
        try {
            setLoading(true);
            const [clientesData, colaboradoresData] = await Promise.all([
                getClientes(),
                getColaboradores()
            ]);
            setClientes(clientesData);
            setColaboradores(colaboradoresData);

            if (isEditing && id) {
                const projeto = await getProjetoById(id);
                if (projeto) {
                    setFormData({
                        clienteId: projeto.clienteId,
                        nomeProjeto: projeto.nomeProjeto,
                        empresa: projeto.empresa || '',
                        enderecoObra: projeto.enderecoObra || '',
                        dataInicio: projeto.dataInicio || '',
                        dataPrevistaTermino: projeto.dataPrevistaTermino || '',
                        status: projeto.status,
                        observacoes: projeto.observacoes || ''
                    });
                } else {
                    setError('Projeto não encontrado');
                }
            }
        } catch (err: any) {
            setError(err.message || 'Erro ao carregar dados');
        } finally {
            setLoading(false);
        }
    };

    const handleAddEtapa = () => {
        setEtapas([...etapas, {
            idTemp: Math.random().toString(36).substr(2, 9),
            nomeEtapa: '',
            dataInicioPrevista: '',
            dataFimPrevista: '',
            colaboradorId: ''
        }]);
    };

    const handleRemoveEtapa = (idTemp: string) => {
        setEtapas(etapas.filter(e => e.idTemp !== idTemp));
    };

    const handleEtapaChange = (idTemp: string, field: keyof EtapaInput, value: string) => {
        setEtapas(etapas.map(e => e.idTemp === idTemp ? { ...e, [field]: value } : e));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!formData.nomeProjeto || !formData.clienteId) {
            setError('Nome do Projeto e Cliente são obrigatórios.');
            return;
        }

        try {
            setSaving(true);
            const dataToSave = { ...formData };
            let projetoId = id;

            if (isEditing && id) {
                await updateProjeto(id, dataToSave);
            } else {
                const newProjeto = await createProjeto(dataToSave);
                projetoId = newProjeto.id;
            }

            // Save stages if any
            if (projetoId && etapas.length > 0) {
                // Filter stages with names
                const stagesToCreate = etapas.filter(e => e.nomeEtapa.trim() !== '');

                // Create stages sequentially for simplicity
                for (let i = 0; i < stagesToCreate.length; i++) {
                    const stage = stagesToCreate[i];
                    await createEtapa({
                        projetoId: projetoId,
                        nomeEtapa: stage.nomeEtapa,
                        ordem: i + 1,
                        dataInicioPrevista: stage.dataInicioPrevista || undefined,
                        dataFimPrevista: stage.dataFimPrevista || undefined,
                        status: 'nao_iniciado',
                        colaboradorId: stage.colaboradorId || undefined
                    });
                }
            }

            if (preSelectedClienteId && dataToSave.clienteId === preSelectedClienteId) {
                navigate(`/clientes/${dataToSave.clienteId}`);
            } else {
                navigate('/projetos');
            }
        } catch (err: any) {
            setError(err.message || 'Erro ao salvar projeto');
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    if (loading) return <div className="p-6 text-slate-300">Carregando...</div>;

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold text-white mb-6">
                {isEditing ? 'Editar Projeto' : 'Novo Projeto'}
            </h1>

            {error && (
                <div className="bg-red-500/10 border border-red-500 text-red-500 p-4 rounded-md mb-6">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="bg-surface p-6 rounded-lg border border-slate-700 space-y-4">
                    <h2 className="text-lg font-semibold text-white border-b border-slate-700 pb-2 mb-4">Dados do Projeto</h2>

                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Cliente *</label>
                        <select
                            name="clienteId"
                            value={formData.clienteId}
                            onChange={handleChange}
                            className="w-full bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-white focus:border-primary focus:outline-none"
                            required
                            disabled={!!preSelectedClienteId && !isEditing}
                        >
                            <option value="">Selecione um cliente...</option>
                            {clientes.map(c => (
                                <option key={c.id} value={c.id}>
                                    {c.nome}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Nome do Projeto *</label>
                        <input
                            type="text"
                            name="nomeProjeto"
                            value={formData.nomeProjeto}
                            onChange={handleChange}
                            className="w-full bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-white focus:border-primary focus:outline-none"
                            placeholder="Ex: Reforma Apartamento 101"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">Empresa</label>
                            <input
                                type="text"
                                name="empresa"
                                value={formData.empresa}
                                onChange={handleChange}
                                className="w-full bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-white focus:border-primary focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">Status</label>
                            <select
                                name="status"
                                value={formData.status}
                                onChange={handleChange}
                                className="w-full bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-white focus:border-primary focus:outline-none"
                            >
                                <option value="planejamento">Planejamento</option>
                                <option value="em_andamento">Em Andamento</option>
                                <option value="concluido">Concluído</option>
                                <option value="cancelado">Cancelado</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Endereço da Obra</label>
                        <input
                            type="text"
                            name="enderecoObra"
                            value={formData.enderecoObra}
                            onChange={handleChange}
                            className="w-full bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-white focus:border-primary focus:outline-none"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">Data Início</label>
                            <input
                                type="date"
                                name="dataInicio"
                                value={formData.dataInicio}
                                onChange={handleChange}
                                className="w-full bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-white focus:border-primary focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">Previsão Término</label>
                            <input
                                type="date"
                                name="dataPrevistaTermino"
                                value={formData.dataPrevistaTermino}
                                onChange={handleChange}
                                className="w-full bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-white focus:border-primary focus:outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Observações</label>
                        <textarea
                            name="observacoes"
                            value={formData.observacoes}
                            onChange={handleChange}
                            rows={3}
                            className="w-full bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-white focus:border-primary focus:outline-none"
                        ></textarea>
                    </div>
                </div>

                {/* Seção de Etapas */}
                {!isEditing && (
                    <div className="bg-surface p-6 rounded-lg border border-slate-700">
                        <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-2">
                            <h2 className="text-lg font-semibold text-white">Etapas do Projeto (Opcional)</h2>
                            <button
                                type="button"
                                onClick={handleAddEtapa}
                                className="text-xs bg-slate-700 hover:bg-slate-600 text-white px-3 py-1 rounded transition-colors"
                            >
                                + Adicionar Etapa
                            </button>
                        </div>

                        {etapas.length === 0 ? (
                            <p className="text-sm text-slate-500 text-center py-4">Nenhuma etapa adicionada.</p>
                        ) : (
                            <div className="space-y-4">
                                {etapas.map((etapa, index) => (
                                    <div key={etapa.idTemp} className="p-4 bg-slate-800/50 border border-slate-700 rounded-md relative group">
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveEtapa(etapa.idTemp!)}
                                            className="absolute top-2 right-2 text-slate-500 hover:text-red-500 text-sm"
                                        >
                                            &times;
                                        </button>
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                            <div className="md:col-span-1">
                                                <label className="block text-xs text-slate-500 mb-1">Nome da Etapa</label>
                                                <input
                                                    type="text"
                                                    value={etapa.nomeEtapa}
                                                    onChange={e => handleEtapaChange(etapa.idTemp!, 'nomeEtapa', e.target.value)}
                                                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-white text-sm focus:border-primary outline-none"
                                                    placeholder="Ex: Alvenaria"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-slate-500 mb-1">Início Previsto</label>
                                                <input
                                                    type="date"
                                                    value={etapa.dataInicioPrevista}
                                                    onChange={e => handleEtapaChange(etapa.idTemp!, 'dataInicioPrevista', e.target.value)}
                                                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-white text-sm focus:border-primary outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-slate-500 mb-1">Fim Previsto</label>
                                                <input
                                                    type="date"
                                                    value={etapa.dataFimPrevista}
                                                    onChange={e => handleEtapaChange(etapa.idTemp!, 'dataFimPrevista', e.target.value)}
                                                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-white text-sm focus:border-primary outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-slate-500 mb-1">Responsável</label>
                                                <select
                                                    value={etapa.colaboradorId}
                                                    onChange={e => handleEtapaChange(etapa.idTemp!, 'colaboradorId', e.target.value)}
                                                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-white text-sm focus:border-primary outline-none"
                                                >
                                                    <option value="">Sem responsável</option>
                                                    {colaboradores.map(c => (
                                                        <option key={c.id} value={c.id}>{c.nome}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                <div className="flex justify-end space-x-3 pt-4">
                    <button
                        type="button"
                        onClick={() => navigate(-1)}
                        className="px-4 py-2 text-slate-300 hover:text-white transition-colors"
                        disabled={saving}
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        className="bg-primary hover:bg-primary-dark text-white px-6 py-2 rounded-md transition duration-200 disabled:opacity-50"
                        disabled={saving}
                    >
                        {saving ? 'Salvando...' : 'Salvar Projeto'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ProjetoFormPage;
