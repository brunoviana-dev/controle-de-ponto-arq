import React, { useState, useEffect } from 'react';
import { supabase } from '../../../services/supabaseClient';
import { getEmpresaAtualId } from '../../../utils/config';
import { tarefasService } from '../../../services/tarefasService';
import { getProjetos } from '../../../services/projetosService';
import { getEtapasByProjeto } from '../../../services/projetoEtapasService';
import { getColaboradores } from '../../../services/colaboradorService';

interface TarefaModalProps {
    isOpen: boolean;
    onClose: () => void;
    // Se existir 'tarefaId', estamos em edição (só funciona pra manuais). Se null, criação.
    tarefaId?: string | null;
}

const TarefaModal: React.FC<TarefaModalProps> = ({ isOpen, onClose, tarefaId }) => {
    const [titulo, setTitulo] = useState('');
    const [descricao, setDescricao] = useState('');
    const [dataInicio, setDataInicio] = useState('');
    const [dataFim, setDataFim] = useState('');
    const [horaInicio, setHoraInicio] = useState('');
    const [horaFim, setHoraFim] = useState('');
    const [diaInteiro, setDiaInteiro] = useState(false);
    const [projetoId, setProjetoId] = useState('');
    const [etapaId, setEtapaId] = useState('');
    const [colaboradoresSelecionados, setColaboradoresSelecionados] = useState<string[]>([]);

    // Opções dos selects
    const [projetos, setProjetos] = useState<any[]>([]);
    const [etapas, setEtapas] = useState<any[]>([]);
    const [colaboradores, setColaboradores] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            carregarOpcoes();
            if (tarefaId) {
                carregarTarefa();
            } else {
                resetForm();
            }
        }
    }, [isOpen, tarefaId]);

    useEffect(() => {
        if (projetoId) {
            carregarEtapas(projetoId);
        } else {
            setEtapas([]);
            setEtapaId('');
        }
    }, [projetoId]);

    const carregarOpcoes = async () => {
        try {
            const respColabs = await getColaboradores();
            const respProjs = await getProjetos();
            setColaboradores(respColabs);
            setProjetos(respProjs);
        } catch (error) {
            console.error('Erro ao carregar selects', error);
        }
    };

    const carregarEtapas = async (pId: string) => {
        try {
            const resp = await getEtapasByProjeto(pId);
            setEtapas(resp);
        } catch (error) {
            console.error('Erro ao carregar etapas', error);
        }
    };

    const carregarTarefa = async () => {
        try {
            setLoading(true);
            const empresaId = getEmpresaAtualId();
            const tarefa = await tarefasService.getTarefaById(tarefaId!, empresaId);
            if (tarefa) {
                setTitulo(tarefa.titulo);
                setDescricao(tarefa.descricao || '');
                setDataInicio(tarefa.data_inicio || '');
                setDataFim(tarefa.data_fim || '');
                setHoraInicio(tarefa.hora_inicio || '');
                setHoraFim(tarefa.hora_fim || '');
                setDiaInteiro(tarefa.dia_inteiro);
                setProjetoId(tarefa.projeto_id || '');
                setEtapaId(tarefa.etapa_id || '');
                setColaboradoresSelecionados(tarefa.colaboradores_ids || []);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setTitulo('');
        setDescricao('');
        setDataInicio(new Date().toISOString().split('T')[0]);
        setDataFim('');
        setHoraInicio('09:00');
        setHoraFim('10:00');
        setDiaInteiro(false);
        setProjetoId('');
        setEtapaId('');
        setColaboradoresSelecionados([]);
    };

    const toggleColaborador = (id: string) => {
        if (colaboradoresSelecionados.includes(id)) {
            setColaboradoresSelecionados(prev => prev.filter(c => c !== id));
        } else {
            setColaboradoresSelecionados(prev => [...prev, id]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!titulo || !dataInicio) {
            alert("Preencha o título e a data de início!");
            return;
        }

        setLoading(true);
        const empresaId = getEmpresaAtualId();

        const tarefaData = {
            empresa_id: empresaId,
            titulo,
            descricao: descricao || undefined,
            data_inicio: dataInicio || undefined,
            data_fim: dataFim || dataInicio,
            hora_inicio: diaInteiro ? null : (horaInicio || null),
            hora_fim: diaInteiro ? null : (horaFim || null),
            dia_inteiro: diaInteiro,
            projeto_id: projetoId || null,
            etapa_id: etapaId || null,
            status: 'pendente' as 'pendente' | 'concluída'
        };

        try {
            if (tarefaId) {
                await tarefasService.updateTarefa(tarefaId, empresaId, tarefaData, colaboradoresSelecionados);
            } else {
                await tarefasService.createTarefa(tarefaData, colaboradoresSelecionados);
            }
            onClose();
        } catch (error) {
            alert("Erro ao salvar tarefa!");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-surface border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-slideUp">

                <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
                    <h2 className="text-xl font-bold text-white flex items-center gap-3">
                        <span className="p-2 bg-primary/20 text-primary rounded-lg ring-1 ring-primary/30">📅</span>
                        {tarefaId ? 'Editar Tarefa' : 'Nova Tarefa'}
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                    <form id="tarefaForm" onSubmit={handleSubmit} className="space-y-6">

                        {/* Título e Dia Inteiro */}
                        <div className="flex gap-4 items-start">
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-slate-300 mb-1">Título da Tarefa *</label>
                                <input
                                    type="text"
                                    required
                                    value={titulo}
                                    onChange={e => setTitulo(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-slate-200 focus:ring-primary focus:border-primary transition-all"
                                    placeholder="Ex: Reunião de Alinhamento"
                                />
                            </div>
                            <div className="pt-8">
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        checked={diaInteiro}
                                        onChange={e => setDiaInteiro(e.target.checked)}
                                        className="w-5 h-5 rounded border-slate-600 bg-slate-900 text-primary focus:ring-primary focus:ring-offset-slate-800 transition-colors"
                                    />
                                    <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">Dia Inteiro</span>
                                </label>
                            </div>
                        </div>

                        {/* Datas e Horários */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-800/30 p-4 rounded-xl border border-slate-700/50">
                            <div className="col-span-1 md:col-span-2">
                                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Data Início</label>
                                <input
                                    type="date"
                                    required
                                    value={dataInicio}
                                    onChange={e => setDataInicio(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-slate-200 focus:ring-primary focus:border-primary"
                                />
                            </div>

                            {!diaInteiro && (
                                <>
                                    <div className="col-span-1 md:col-span-1">
                                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Hora Inicio</label>
                                        <input
                                            type="time"
                                            value={horaInicio}
                                            onChange={e => setHoraInicio(e.target.value)}
                                            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-slate-200 focus:ring-primary focus:border-primary"
                                        />
                                    </div>
                                    <div className="col-span-1 md:col-span-1">
                                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Hora Fim</label>
                                        <input
                                            type="time"
                                            value={horaFim}
                                            onChange={e => setHoraFim(e.target.value)}
                                            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-slate-200 focus:ring-primary focus:border-primary"
                                        />
                                    </div>
                                </>
                            )}

                            {/* Data Fim opcional permitindo multi-dia */}
                            {diaInteiro && (
                                <div className="col-span-1 md:col-span-2">
                                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Data Fim <span className="text-slate-500 lowercase">(opcional)</span></label>
                                    <input
                                        type="date"
                                        value={dataFim}
                                        min={dataInicio}
                                        onChange={e => setDataFim(e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-slate-200 focus:ring-primary focus:border-primary"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Projetos e Etapas */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Vincular Projeto</label>
                                <select
                                    value={projetoId}
                                    onChange={(e) => setProjetoId(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-slate-200 focus:ring-primary focus:border-primary"
                                >
                                    <option value="">Nenhum</option>
                                    {projetos.map(p => (
                                        <option key={p.id} value={p.id}>{p.nomeProjeto}</option>
                                    ))}
                                </select>
                            </div>

                            {projetoId && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Vincular Etapa</label>
                                    <select
                                        value={etapaId}
                                        onChange={(e) => setEtapaId(e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-slate-200 focus:ring-primary focus:border-primary"
                                    >
                                        <option value="">Nenhuma</option>
                                        {etapas.map(e => (
                                            <option key={e.id} value={e.id}>{e.nomeEtapa}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>

                        {/* Participantes */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Colaboradores Participantes</label>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 bg-slate-800/30 p-3 rounded-xl border border-slate-700/50 max-h-40 overflow-y-auto custom-scrollbar">
                                {colaboradores.map(c => (
                                    <label key={c.id} className={`
                    flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors border text-sm
                    ${colaboradoresSelecionados.includes(c.id)
                                            ? 'bg-primary/20 border-primary/50 text-primary-light'
                                            : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'}
                  `}>
                                        <input
                                            type="checkbox"
                                            className="sr-only"
                                            checked={colaboradoresSelecionados.includes(c.id)}
                                            onChange={() => toggleColaborador(c.id)}
                                        />
                                        <div className={`w-4 h-4 rounded-sm border flex items-center justify-center
                      ${colaboradoresSelecionados.includes(c.id) ? 'bg-primary border-primary text-white' : 'border-slate-500'}
                    `}>
                                            {colaboradoresSelecionados.includes(c.id) && <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                        </div>
                                        <span className="truncate">{c.nome}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Descrição */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Descrição / Notas</label>
                            <textarea
                                rows={3}
                                value={descricao}
                                onChange={e => setDescricao(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-slate-200 focus:ring-primary focus:border-primary custom-scrollbar resize-none"
                                placeholder="Detalhes adicionais da tarefa..."
                            ></textarea>
                        </div>

                    </form>
                </div>

                <div className="p-4 border-t border-slate-700 bg-slate-800 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2 text-sm font-medium text-slate-300 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors border border-slate-600"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        form="tarefaForm"
                        disabled={loading}
                        className="btn-primary py-2 px-6 text-sm flex items-center gap-2"
                    >
                        {loading && <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                        Salvar Tarefa
                    </button>
                </div>

            </div>
        </div>
    );
};

export default TarefaModal;
