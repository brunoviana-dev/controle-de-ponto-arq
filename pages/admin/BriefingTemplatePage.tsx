import React, { useEffect, useState } from 'react';
import { BriefingPergunta, PerguntaTipo } from '../../services/interfaces/types';
import { briefingPerguntasService } from '../../services/briefingPerguntasService';
import ConfirmModal from '../../components/ConfirmModal';

const BriefingTemplatePage: React.FC = () => {
    const [perguntas, setPerguntas] = useState<BriefingPergunta[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [selectedPergunta, setSelectedPergunta] = useState<BriefingPergunta | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    // Form states
    const [formData, setFormData] = useState<Partial<BriefingPergunta>>({
        pergunta: '',
        tipo: 'texto',
        obrigatorio: false,
        ordem: 0,
        ativo: true,
        opcoes: []
    });
    const [opcoesText, setOpcoesText] = useState('');

    const fetchData = async () => {
        try {
            setLoading(true);
            const data = await briefingPerguntasService.getPerguntas();
            setPerguntas(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleOpenModal = (pergunta?: BriefingPergunta) => {
        if (pergunta) {
            setSelectedPergunta(pergunta);
            setFormData({
                pergunta: pergunta.pergunta,
                tipo: pergunta.tipo,
                obrigatorio: pergunta.obrigatorio,
                ordem: pergunta.ordem,
                ativo: pergunta.ativo,
                opcoes: pergunta.opcoes || []
            });
            setOpcoesText(pergunta.opcoes ? pergunta.opcoes.join('\n') : '');
        } else {
            setSelectedPergunta(null);
            setFormData({
                pergunta: '',
                tipo: 'texto',
                obrigatorio: false,
                ordem: perguntas.length > 0 ? Math.max(...perguntas.map(p => p.ordem)) + 10 : 10,
                ativo: true,
                opcoes: []
            });
            setOpcoesText('');
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!formData.pergunta) {
            setError('A pergunta é obrigatória.');
            return;
        }

        const requiresOptions = ['select', 'radio', 'checkbox'].includes(formData.tipo as string);
        const processedOpcoes = requiresOptions
            ? opcoesText.split('\n').map(o => o.trim()).filter(o => o !== '')
            : [];

        if (requiresOptions && processedOpcoes.length === 0) {
            setError('Para este tipo de pergunta, pelo menos uma opção deve ser informada.');
            return;
        }

        setIsProcessing(true);
        try {
            const dataToSave = {
                ...formData,
                opcoes: processedOpcoes
            } as Omit<BriefingPergunta, 'id' | 'created_at'>;

            if (selectedPergunta) {
                await briefingPerguntasService.updatePergunta(selectedPergunta.id, dataToSave);
            } else {
                await briefingPerguntasService.createPergunta(dataToSave);
            }
            setIsModalOpen(false);
            fetchData();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedPergunta) return;
        setIsProcessing(true);
        try {
            await briefingPerguntasService.deletePergunta(selectedPergunta.id);
            setIsConfirmModalOpen(false);
            fetchData();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const confirmDelete = (pergunta: BriefingPergunta) => {
        setSelectedPergunta(pergunta);
        setIsConfirmModalOpen(true);
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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Template de Briefing</h1>
                    <p className="text-slate-400">Gerencie as perguntas que serão exibidas nos briefings dos projetos</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-md transition-colors flex items-center gap-2 shadow-lg shadow-primary/20"
                >
                    <span>+</span> Nova Pergunta
                </button>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500 text-red-500 p-4 rounded-md">
                    {error}
                </div>
            )}

            <div className="bg-surface border border-slate-700 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse text-sm">
                    <thead>
                        <tr className="bg-slate-800/50 border-b border-slate-700">
                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider w-20 text-center">Ordem</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Pergunta</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Tipo</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Obrig.</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Status</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right w-40">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                        {perguntas.map((p) => (
                            <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                                <td className="px-6 py-4 text-center font-mono text-slate-400">{p.ordem}</td>
                                <td className="px-6 py-4">
                                    <span className="text-white font-medium">{p.pergunta}</span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className="px-2 py-0.5 rounded bg-slate-700 text-slate-300 text-[10px] uppercase font-bold tracking-wider">
                                        {p.tipo}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    {p.obrigatorio ? (
                                        <span className="text-emerald-400">Sim</span>
                                    ) : (
                                        <span className="text-slate-500">Não</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${p.ativo
                                        ? 'bg-emerald-500/20 text-emerald-400'
                                        : 'bg-slate-500/20 text-slate-400'
                                        }`}>
                                        {p.ativo ? 'Ativo' : 'Inativo'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <button
                                            onClick={() => handleOpenModal(p)}
                                            className="text-[11px] px-2 py-1 rounded border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 transition-colors"
                                        >
                                            Editar
                                        </button>
                                        <button
                                            onClick={() => confirmDelete(p)}
                                            className="text-[11px] px-2 py-1 rounded border border-red-500/30 text-red-500 hover:bg-red-500/10 transition-colors"
                                        >
                                            Excluir
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}

                        {perguntas.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-6 py-10 text-center text-slate-500">
                                    Nenhuma pergunta cadastrada no template.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal de Criação/Edição */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-surface border border-slate-700 rounded-xl shadow-2xl w-full max-w-lg p-6 animate-in fade-in zoom-in duration-200">
                        <h2 className="text-xl font-bold text-white mb-6">
                            {selectedPergunta ? 'Editar Pergunta' : 'Nova Pergunta'}
                        </h2>

                        <form onSubmit={handleSave} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Pergunta</label>
                                <input
                                    type="text"
                                    className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white focus:border-primary outline-none"
                                    value={formData.pergunta}
                                    onChange={(e) => setFormData({ ...formData, pergunta: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Tipo</label>
                                    <select
                                        className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white focus:border-primary outline-none"
                                        value={formData.tipo}
                                        onChange={(e) => setFormData({ ...formData, tipo: e.target.value as PerguntaTipo })}
                                    >
                                        <option value="texto">Texto Curto</option>
                                        <option value="textarea">Texto Longo</option>
                                        <option value="numero">Número</option>
                                        <option value="email">Email</option>
                                        <option value="telefone">Telefone</option>
                                        <option value="select">Seleção (Select)</option>
                                        <option value="radio">Seleção Única (Radio)</option>
                                        <option value="checkbox">Seleção Múltipla (Checkbox)</option>
                                        <option value="data">Data</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Ordem</label>
                                    <input
                                        type="number"
                                        className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white focus:border-primary outline-none"
                                        value={formData.ordem}
                                        onChange={(e) => setFormData({ ...formData, ordem: parseInt(e.target.value) })}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-6 py-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 accent-primary"
                                        checked={formData.obrigatorio}
                                        onChange={(e) => setFormData({ ...formData, obrigatorio: e.target.checked })}
                                    />
                                    <span className="text-sm text-slate-300">Obrigatório</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 accent-primary"
                                        checked={formData.ativo}
                                        onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                                    />
                                    <span className="text-sm text-slate-300">Ativo</span>
                                </label>
                            </div>

                            {['select', 'radio', 'checkbox'].includes(formData.tipo as string) && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">
                                        Opções (uma por linha)
                                    </label>
                                    <textarea
                                        rows={4}
                                        className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white focus:border-primary outline-none text-sm"
                                        placeholder="Opção 1&#10;Opção 2&#10;Opção 3"
                                        value={opcoesText}
                                        onChange={(e) => setOpcoesText(e.target.value)}
                                    ></textarea>
                                </div>
                            )}

                            <div className="flex justify-end gap-3 mt-8">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isProcessing}
                                    className="px-4 py-2 rounded bg-primary text-white hover:bg-primary-dark transition-colors flex items-center gap-2"
                                >
                                    {isProcessing ? 'Salvando...' : 'Salvar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de Confirmação de Deleção */}
            <ConfirmModal
                isOpen={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                onConfirm={handleDelete}
                title="Excluir Pergunta"
                message={`Tem certeza que deseja excluir a pergunta "${selectedPergunta?.pergunta}"?`}
                confirmText="Excluir"
                isLoading={isProcessing}
            />
        </div>
    );
};

export default BriefingTemplatePage;
