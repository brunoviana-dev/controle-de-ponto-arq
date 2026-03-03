import React, { useEffect, useState } from 'react';
import { BriefingOpcao, BriefingPergunta, PerguntaTipo } from '../../services/interfaces/types';
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
        instagram: false,
        opcoes: []
    });

    const slugify = (text: string) => {
        return text
            .toString()
            .toLowerCase()
            .trim()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^\w\s-]/g, '')
            .replace(/[\s_-]+/g, '-')
            .replace(/^-+|-+$/g, '');
    };

    const fetchData = async (showLoading = true) => {
        try {
            if (showLoading) setLoading(true);
            const data = await briefingPerguntasService.getPerguntas();
            setPerguntas(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            if (showLoading) setLoading(false);
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
                instagram: pergunta.instagram,
                opcoes: (pergunta.opcoes || []) as BriefingOpcao[]
            });
        } else {
            setSelectedPergunta(null);
            setFormData({
                pergunta: '',
                tipo: 'texto',
                obrigatorio: false,
                ordem: perguntas.length > 0 ? Math.max(...perguntas.map(p => p.ordem)) + 10 : 10,
                ativo: true,
                instagram: false,
                opcoes: []
            });
        }
        setIsModalOpen(true);
    };

    const handleAddOption = () => {
        const currentOpcoes = (formData.opcoes || []) as BriefingOpcao[];
        setFormData({
            ...formData,
            opcoes: [...currentOpcoes, { label: '', value: '', image_url: null }]
        });
    };

    const handleOptionChange = (index: number, field: keyof BriefingOpcao, value: any) => {
        const currentOpcoes = [...((formData.opcoes || []) as BriefingOpcao[])];
        currentOpcoes[index] = { ...currentOpcoes[index], [field]: value };

        // Auto-slugify value if label changes and value is empty or matches old label slug
        if (field === 'label' && (!currentOpcoes[index].value || currentOpcoes[index].value === slugify(currentOpcoes[index].label))) {
            // We'll update the value in a second pass if needed, but for now let's just update label
        }

        setFormData({ ...formData, opcoes: currentOpcoes });
    };

    const handleRemoveOption = (index: number) => {
        const currentOpcoes = [...((formData.opcoes || []) as BriefingOpcao[])];
        currentOpcoes.splice(index, 1);
        setFormData({ ...formData, opcoes: currentOpcoes });
    };

    const handleImageUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setIsProcessing(true);
            const url = await briefingPerguntasService.uploadOpcaoImagem(file);
            handleOptionChange(index, 'image_url', url);
        } catch (err: any) {
            setError('Erro ao fazer upload da imagem: ' + err.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!formData.pergunta) {
            setError('A pergunta é obrigatória.');
            return;
        }

        const requiresOptions = ['select', 'radio', 'checkbox'].includes(formData.tipo as string);
        let processedOpcoes = (formData.opcoes || []) as BriefingOpcao[];

        if (requiresOptions) {
            processedOpcoes = processedOpcoes.filter(opt => opt.label.trim() !== '');
            if (processedOpcoes.length === 0) {
                setError('Para este tipo de pergunta, pelo menos uma opção com rótulo deve ser informada.');
                return;
            }
            // Ensure values are set
            processedOpcoes = processedOpcoes.map(opt => ({
                ...opt,
                value: opt.value.trim() || slugify(opt.label)
            }));
        } else {
            processedOpcoes = [];
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
            fetchData(false);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleToggleField = async (pergunta: BriefingPergunta, field: 'obrigatorio' | 'ativo' | 'instagram') => {
        const newValue = !pergunta[field];

        // Optimistic Update
        setPerguntas(prev => prev.map(p => p.id === pergunta.id ? { ...p, [field]: newValue } : p));

        try {
            await briefingPerguntasService.updatePergunta(pergunta.id, { [field]: newValue });
            // No need for fetchData if update was successful
        } catch (err: any) {
            setError(err.message);
            fetchData(); // Rollback to actual data on error
        }
    };

    const handleReorder = async (pergunta: BriefingPergunta, direction: 'up' | 'down') => {
        const currentIndex = perguntas.findIndex(p => p.id === pergunta.id);
        if (currentIndex === -1) return;

        const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
        if (targetIndex < 0 || targetIndex >= perguntas.length) return;

        const targetPergunta = perguntas[targetIndex];

        // Optimistic Update
        const newPerguntas = [...perguntas];
        // Swapping orders locally
        const tempOrder = pergunta.ordem;
        newPerguntas[currentIndex] = { ...targetPergunta, ordem: tempOrder };
        newPerguntas[targetIndex] = { ...pergunta, ordem: targetPergunta.ordem };

        // Sorting locally after swap
        newPerguntas.sort((a, b) => a.ordem - b.ordem);
        setPerguntas(newPerguntas);

        try {
            await Promise.all([
                briefingPerguntasService.updatePergunta(pergunta.id, { ordem: targetPergunta.ordem }),
                briefingPerguntasService.updatePergunta(targetPergunta.id, { ordem: pergunta.ordem })
            ]);
        } catch (err: any) {
            setError(err.message);
            fetchData(); // Rollback on error
        }
    };

    const handleDelete = async () => {
        if (!selectedPergunta) return;

        const idToDelete = selectedPergunta.id;

        // Optimistic Update
        setPerguntas(prev => prev.filter(p => p.id !== idToDelete));
        setIsConfirmModalOpen(false);
        setIsProcessing(true);

        try {
            await briefingPerguntasService.deletePergunta(idToDelete);
            // No need for fetchData(true) as we already updated locally
            fetchData(false);
        } catch (err: any) {
            setError(err.message);
            fetchData(); // Rollback on error
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
                    <h1 className="text-2xl font-bold text-white">Perguntas do Briefing</h1>
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

            <div className="bg-surface border border-slate-700 rounded-xl overflow-hidden shadow-xl">
                <table className="w-full text-left border-collapse text-sm">
                    <thead>
                        <tr className="bg-slate-800/50 border-b border-slate-700">
                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider w-20 text-center">Ordem</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Pergunta</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Tipo</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Status</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Obrig.</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Insta</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right w-40">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                        {perguntas.map((p, idx) => (
                            <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex flex-col items-center gap-1">
                                        <button
                                            onClick={() => handleReorder(p, 'up')}
                                            disabled={idx === 0}
                                            className={`p-1 rounded text-slate-500 hover:text-white transition-colors disabled:opacity-20 disabled:cursor-not-allowed`}
                                            title="Mover para cima"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 15l7-7 7 7" /></svg>
                                        </button>
                                        <button
                                            onClick={() => handleReorder(p, 'down')}
                                            disabled={idx === perguntas.length - 1}
                                            className={`p-1 rounded text-slate-500 hover:text-white transition-colors disabled:opacity-20 disabled:cursor-not-allowed`}
                                            title="Mover para baixo"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
                                        </button>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                        <span className="text-white font-medium">{p.pergunta}</span>
                                        {['select', 'radio', 'checkbox'].includes(p.tipo) && (
                                            <span className="text-[10px] text-slate-500 italic mt-0.5">
                                                {((p.opcoes || []) as BriefingOpcao[]).length} opções disponíveis
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className="px-2 py-0.5 rounded bg-slate-700 text-slate-300 text-[10px] uppercase font-bold tracking-wider">
                                        {p.tipo}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <input
                                        type="checkbox"
                                        checked={p.ativo}
                                        onChange={() => handleToggleField(p, 'ativo')}
                                        className="w-4 h-4 accent-blue-500 cursor-pointer"
                                    />
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <input
                                        type="checkbox"
                                        checked={p.obrigatorio}
                                        disabled={!p.ativo}
                                        onChange={() => handleToggleField(p, 'obrigatorio')}
                                        className="w-4 h-4 accent-emerald-500 cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed"
                                    />
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <input
                                        type="checkbox"
                                        checked={p.instagram}
                                        disabled={!p.ativo}
                                        onChange={() => handleToggleField(p, 'instagram')}
                                        className="w-4 h-4 accent-pink-500 cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed"
                                    />
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
                    <div className="bg-surface border border-slate-700 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col p-6 animate-in fade-in zoom-in duration-200">
                        <h2 className="text-xl font-bold text-white mb-6">
                            {selectedPergunta ? 'Editar Pergunta' : 'Nova Pergunta'}
                        </h2>

                        <form onSubmit={handleSave} className="space-y-4 overflow-y-auto flex-1 pr-2 custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Pergunta</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white focus:border-primary outline-none"
                                        value={formData.pergunta}
                                        onChange={(e) => setFormData({ ...formData, pergunta: e.target.value })}
                                    />
                                </div>

                                <div className="md:col-span-2">
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
                                        <option value="arquivo">Arquivo (Upload)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex items-center gap-6 py-2">
                                <label className={`flex items-center gap-2 cursor-pointer ${!formData.ativo ? 'opacity-30 cursor-not-allowed' : ''}`}>
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 accent-primary"
                                        checked={formData.obrigatorio}
                                        disabled={!formData.ativo}
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
                                <label className={`flex items-center gap-2 cursor-pointer ${!formData.ativo ? 'opacity-30 cursor-not-allowed' : ''}`}>
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 accent-primary"
                                        checked={formData.instagram}
                                        disabled={!formData.ativo}
                                        onChange={(e) => setFormData({ ...formData, instagram: e.target.checked })}
                                    />
                                    <span className="text-sm text-slate-300">Instagram</span>
                                </label>
                            </div>

                            {['select', 'radio', 'checkbox'].includes(formData.tipo as string) && (
                                <div className="space-y-4 pt-4 border-t border-slate-700">
                                    <div className="flex items-center justify-between">
                                        <label className="block text-sm font-bold text-slate-300 uppercase tracking-wider">
                                            Opções Dinâmicas
                                        </label>
                                        <button
                                            type="button"
                                            onClick={handleAddOption}
                                            className="text-xs px-3 py-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded hover:bg-emerald-500 hover:text-white transition-all font-bold"
                                        >
                                            + Adicionar Opção
                                        </button>
                                    </div>

                                    <div className="space-y-3">
                                        {((formData.opcoes || []) as BriefingOpcao[]).map((opt, idx) => (
                                            <div key={idx} className="bg-slate-900/50 p-3 rounded-lg border border-slate-800 flex flex-col gap-3 relative group">
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveOption(idx)}
                                                    className="absolute top-2 right-2 text-slate-500 hover:text-red-500 transition-colors"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                                </button>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Rótulo (Label)</label>
                                                        <input
                                                            type="text"
                                                            placeholder="Ex: Opção A"
                                                            className="w-full bg-slate-800 border border-slate-700 rounded p-1.5 text-sm text-white focus:border-primary outline-none"
                                                            value={opt.label}
                                                            onChange={(e) => handleOptionChange(idx, 'label', e.target.value)}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Valor (Value - opcional)</label>
                                                        <input
                                                            type="text"
                                                            placeholder="Ex: opcao-a"
                                                            className="w-full bg-slate-800 border border-slate-700 rounded p-1.5 text-sm text-white focus:border-primary outline-none"
                                                            value={opt.value}
                                                            onChange={(e) => handleOptionChange(idx, 'value', e.target.value)}
                                                        />
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-4">
                                                    <div className="flex-shrink-0 w-12 h-12 rounded bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden">
                                                        {opt.image_url ? (
                                                            <img src={opt.image_url} alt="Option" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <span className="text-xl">🖼️</span>
                                                        )}
                                                    </div>
                                                    <div className="flex-1">
                                                        <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Imagem (Opcional)</label>
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            className="block w-full text-xs text-slate-500 file:mr-4 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-slate-700 file:text-slate-300 hover:file:bg-slate-600 cursor-pointer"
                                                            onChange={(e) => handleImageUpload(idx, e)}
                                                        />
                                                    </div>
                                                    {opt.image_url && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleOptionChange(idx, 'image_url', null)}
                                                            className="text-[10px] text-red-400 hover:underline"
                                                        >
                                                            Remover Imagem
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                        {((formData.opcoes || []) as BriefingOpcao[]).length === 0 && (
                                            <p className="text-xs text-slate-500 italic text-center py-4 border-2 border-dashed border-slate-800 rounded-lg">
                                                Nenhuma opção adicionada. Clique no botão acima para começar.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-slate-700">
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
                                    className="px-4 py-2 rounded bg-primary text-white hover:bg-primary-dark transition-colors flex items-center gap-2 font-bold shadow-lg shadow-primary/20"
                                >
                                    {isProcessing ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white border-transparent"></div>
                                            Salvando...
                                        </>
                                    ) : (
                                        'Salvar Pergunta'
                                    )}
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
