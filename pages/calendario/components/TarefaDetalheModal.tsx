import React, { useState } from 'react';
import { TarefaLocal } from './CalendarGrid';
import { tarefasService } from '../../../services/tarefasService';
import { getEmpresaAtualId } from '../../../utils/config';
import { Colaborador } from '../../../services/interfaces/types';

interface TarefaDetalheModalProps {
    isOpen: boolean;
    onClose: () => void;
    tarefa: TarefaLocal | null;
    isAdmin: boolean;
    userId?: string;
    colaboradores?: Colaborador[];
    onEditarClick: (id: string) => void;
}

const TarefaDetalheModal: React.FC<TarefaDetalheModalProps> = ({ isOpen, onClose, tarefa, isAdmin, userId, colaboradores = [], onEditarClick }) => {
    const [loading, setLoading] = useState(false);

    if (!isOpen || !tarefa) return null;

    const isVirtual = tarefa.isVirtual;
    const dataOriginal = tarefa.originalData as any; // TarefaComRelacionamentos ou ProjetoEtapa

    // Regras de Visualização
    const isConcluida = tarefa.status === 'concluída' || tarefa.status === 'concluido';
    const podeConcluir = !isConcluida && (!isVirtual) && (isAdmin || dataOriginal.colaboradores_ids?.includes(userId));
    const podeEditar = isAdmin && !isVirtual;

    const handleConcluir = async () => {
        if (!confirm('Deseja realmente marcar esta tarefa como concluída?')) return;

        setLoading(true);
        try {
            await tarefasService.concluirTarefa(tarefa.id, getEmpresaAtualId(), 'concluída');
            onClose(); // Ao fechar a página recarrega os dados
        } catch (error) {
            console.error('Erro ao concluir tarefa', error);
            alert('Erro ao concluir a tarefa.');
        } finally {
            setLoading(false);
        }
    };

    const formataData = (d: Date) => d.toLocaleDateString('pt-BR');

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-surface border border-slate-700/80 rounded-2xl w-full max-w-lg flex flex-col shadow-2xl overflow-hidden animate-slideUp">

                {/* Header Colorido dependendo do tipo da tarefa */}
                <div className={`
          p-6 flex justify-between items-start 
          ${isConcluida ? 'bg-green-500/10 border-b border-green-500/20' :
                        isVirtual || dataOriginal.projeto_id ? 'bg-blue-500/10 border-b border-blue-500/20' :
                            'bg-purple-500/10 border-b border-purple-500/20'}
        `}>
                    <div className="flex-1 pr-4">
                        <div className="flex items-center gap-2 mb-2">
                            <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-sm bg-black/30
                  ${isConcluida ? 'text-green-400' : 'text-slate-300'}
               `}>
                                {isConcluida ? 'Concluída' : 'Pendente'}
                            </span>
                            {isVirtual && <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-sm bg-blue-500/20 text-blue-300">Etapa de Projeto</span>}
                        </div>
                        <h2 className="text-2xl font-bold text-white leading-tight">
                            {tarefa.titulo.replace('[P] ', '')}
                        </h2>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors bg-black/20 p-1.5 rounded-lg">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Corpo dos Detalhes */}
                <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">

                    {/* Sessão Tempo */}
                    <div className="flex items-center gap-4 bg-slate-800/30 p-4 rounded-xl border border-slate-700/50">
                        <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-xl shadow-inner">
                            ⏱️
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-slate-200">
                                {tarefa.dia_inteiro ? 'O Dia Todo' : `${tarefa.hora_inicio?.slice(0, 5) || '--:--'} às ${tarefa.hora_fim?.slice(0, 5) || '--:--'}`}
                            </p>
                            <p className="text-xs text-slate-400 mt-0.5">
                                {formataData(tarefa.data_inicio)}
                                {tarefa.data_inicio.getTime() !== tarefa.data_fim.getTime() && ` até ${formataData(tarefa.data_fim)}`}
                            </p>
                        </div>
                    </div>

                    {/* Dados de Projeto (se houver) */}
                    {(!isVirtual && dataOriginal.projetos) && (
                        <div className="space-y-1">
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest block">Projeto Vinculado</span>
                            <p className="text-slate-200 bg-slate-800/50 px-3 py-2 rounded-lg border border-slate-700/50">{dataOriginal.projetos.nome_projeto}</p>
                            {dataOriginal.projeto_etapas && (
                                <p className="text-sm text-slate-400 mt-1 pl-1">Etapa: <span className="text-blue-400">{dataOriginal.projeto_etapas.nome_etapa}</span></p>
                            )}
                        </div>
                    )}

                    {/* Descrição */}
                    {(!isVirtual && dataOriginal.descricao) && (
                        <div className="space-y-1 pt-2">
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest block">Descrição</span>
                            <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
                                {dataOriginal.descricao}
                            </p>
                        </div>
                    )}

                    {/* Participantes */}
                    {(!isVirtual && dataOriginal.tarefas_colaboradores && dataOriginal.tarefas_colaboradores.length > 0) && (() => {
                        const participantes = dataOriginal.tarefas_colaboradores
                            .map((tc: { colaborador_id: string }) => {
                                const colab = colaboradores.find(c => c.id === tc.colaborador_id);
                                return colab ? colab.nome : tc.colaborador_id;
                            });
                        return (
                            <div className="space-y-2 pt-2 border-t border-slate-700/50">
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest block">Participantes ({participantes.length})</span>
                                <div className="flex flex-wrap gap-2">
                                    {participantes.map((nome: string, i: number) => (
                                        <span key={i} className="px-2.5 py-1 bg-slate-800 border border-slate-600 rounded-md text-xs font-medium text-slate-300">
                                            {nome}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        );
                    })()}
                    {isVirtual && (
                        <div className="space-y-2 pt-2 border-t border-slate-700/50">
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest block">Responsável</span>
                            <p className="text-sm text-slate-300">
                                {dataOriginal.colaborador?.nome || 'Não Atribuído'}
                            </p>
                        </div>
                    )}
                </div>

                {/* Ações */}
                <div className="p-4 border-t border-slate-700 bg-slate-800 flex justify-between gap-3 items-center">

                    {podeEditar ? (
                        <button
                            onClick={() => onEditarClick(tarefa.id)}
                            className="px-4 py-2 text-sm font-bold text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                        >
                            Editar Tarefa
                        </button>
                    ) : <div></div>}

                    <div className="flex gap-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white"
                        >
                            Fechar
                        </button>
                        {podeConcluir && (
                            <button
                                onClick={handleConcluir}
                                disabled={loading}
                                className="py-2 px-6 text-sm font-bold flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors shadow-lg shadow-green-900/20"
                            >
                                {loading && <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                                Concluir Tarefa
                            </button>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default TarefaDetalheModal;
