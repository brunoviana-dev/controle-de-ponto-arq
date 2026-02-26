import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getTipos, createTipo, updateTipo, uploadTemplate, deleteTemplate } from '../../services/projetoTiposService';
import { getEtapasByTipo, saveEtapasByTipo } from '../../services/projetoTipoEtapasService';
import { ProjetoTipo, ProjetoTipoEtapa } from '../../services/interfaces/types';

const TipoProjetoFormPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const isEdit = Boolean(id);

    const [nome, setNome] = useState('');
    const [ativo, setAtivo] = useState(true);
    const [templatePath, setTemplatePath] = useState<string | undefined>(undefined);
    const [etapas, setEtapas] = useState<Partial<ProjetoTipoEtapa>[]>([]);

    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(isEdit);
    const [fileToUpload, setFileToUpload] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isEdit) {
            const fetchTipo = async () => {
                try {
                    const tipos = await getTipos();
                    const tipo = tipos.find(t => t.id === id);
                    if (tipo) {
                        setNome(tipo.nome);
                        setAtivo(tipo.ativo);
                        setTemplatePath(tipo.contratoTemplatePath);

                        // Carregar etapas padrão
                        const etapasData = await getEtapasByTipo(id);
                        setEtapas(etapasData);
                    } else {
                        alert('Tipo de projeto não encontrado.');
                        navigate('/admin/tipos-projeto');
                    }
                } catch (err: any) {
                    alert('Erro ao carregar dados: ' + err.message);
                } finally {
                    setInitialLoading(false);
                }
            };
            fetchTipo();
        }
    }, [id, isEdit, navigate]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.name.toLowerCase().endsWith('.docx')) {
                setFileToUpload(file);
            } else {
                alert('Por favor, selecione apenas arquivos .docx');
                e.target.value = '';
            }
        }
    };

    const addEtapa = () => {
        setEtapas([...etapas, { nomeEtapa: '', ordem: etapas.length + 1 }]);
    };

    const removeEtapa = (index: number) => {
        setEtapas(etapas.filter((_, i) => i !== index));
    };

    const updateEtapaField = (index: number, field: keyof ProjetoTipoEtapa, value: any) => {
        const novasEtapas = [...etapas];
        novasEtapas[index] = { ...novasEtapas[index], [field]: value };
        setEtapas(novasEtapas);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!nome) {
            alert('O nome é obrigatório.');
            return;
        }

        try {
            setLoading(true);
            let finalPath = templatePath;

            // 1. Se houver novo arquivo, fazer upload e remover antigo se necessário
            if (fileToUpload) {
                const newPath = await uploadTemplate(fileToUpload);

                // Se já tinha um template (mesmo que seja um projeto que acabou de ser criado ou editado), remove o antigo
                if (templatePath) {
                    try {
                        await deleteTemplate(templatePath);
                    } catch (err) {
                        console.error('Erro ao deletar template antigo:', err);
                        // Não interrompe o fluxo se falhar ao deletar o antigo para não travar o salvamento
                    }
                }
                finalPath = newPath;
            }

            // 2. Salvar no banco
            let tipoId = id;
            if (isEdit) {
                await updateTipo(id!, {
                    nome,
                    ativo,
                    contratoTemplatePath: finalPath
                });
            } else {
                const novoTipo = await createTipo(nome, ativo, finalPath);
                tipoId = novoTipo.id;
            }

            // 3. Salvar etapas padrão (sincronização)
            if (tipoId) {
                await saveEtapasByTipo(tipoId, etapas);
            }

            navigate('/admin/tipos-projeto');
        } catch (err: any) {
            alert('Erro ao salvar: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    if (initialLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white">
                    {isEdit ? 'Editar Tipo de Projeto' : 'Novo Tipo de Projeto'}
                </h1>
                <p className="text-slate-400">
                    Defina as configurações e o modelo de contrato básico para este tipo
                </p>
            </div>

            <form onSubmit={handleSubmit} className="bg-surface border border-slate-700 rounded-xl p-8 shadow-xl space-y-8">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-400 uppercase mb-2">
                            Nome do Tipo
                        </label>
                        <input
                            type="text"
                            value={nome}
                            onChange={(e) => setNome(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-600 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-primary transition-colors"
                            placeholder="Ex: Arquitetura Residencial"
                            required
                        />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                        <div>
                            <p className="text-white font-bold">Status Ativo</p>
                            <p className="text-xs text-slate-400">Determina se este tipo aparecerá em novos projetos</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setAtivo(!ativo)}
                            className={`w-12 h-6 rounded-full p-1 transition-colors ${ativo ? 'bg-primary' : 'bg-slate-600'}`}
                        >
                            <div className={`w-4 h-4 bg-white rounded-full transition-transform ${ativo ? 'translate-x-6' : 'translate-x-0'}`} />
                        </button>
                    </div>

                    <div className="space-y-4 border-t border-slate-700 pt-6">
                        <label className="block text-sm font-bold text-slate-400 uppercase">
                            Template de Contrato (.docx)
                        </label>

                        {templatePath && !fileToUpload && (
                            <div className="flex items-center justify-between p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                                <span className="text-emerald-400 text-sm flex items-center gap-2">
                                    <span>📄</span> Template atual anexado
                                </span>
                                <span className="text-[10px] text-slate-500 uppercase font-bold">Protegido</span>
                            </div>
                        )}

                        <div className="relative group">
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                accept=".docx"
                                className="hidden"
                            />
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full border-2 border-dashed border-slate-600 rounded-xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer group-hover:border-primary group-hover:bg-primary/5 transition-all"
                            >
                                <span className="text-3xl">📤</span>
                                <div className="text-center">
                                    <p className="text-white font-bold">
                                        {fileToUpload ? fileToUpload.name : 'Clique para selecionar o template'}
                                    </p>
                                    <p className="text-xs text-slate-500 mt-1">Apenas arquivos Word (.docx)</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 border-t border-slate-700 pt-6">
                        <div className="flex items-center justify-between">
                            <label className="block text-sm font-bold text-slate-400 uppercase">
                                Etapas Padrão
                            </label>
                            <button
                                type="button"
                                onClick={addEtapa}
                                className="text-xs px-3 py-1 bg-primary/20 text-primary hover:bg-primary/30 rounded border border-primary/30 transition-colors font-bold uppercase"
                            >
                                + Adicionar Etapa
                            </button>
                        </div>
                        <p className="text-xs text-slate-500 italic">
                            Estas etapas serão criadas automaticamente para cada novo projeto deste tipo.
                        </p>

                        <div className="space-y-3">
                            {etapas.map((etapa, index) => (
                                <div key={index} className="flex items-center gap-3 p-3 bg-slate-800/40 border border-slate-700 rounded-lg group">
                                    <div className="w-8 h-8 flex items-center justify-center bg-slate-700 rounded text-xs font-bold text-slate-400">
                                        {index + 1}
                                    </div>
                                    <input
                                        type="text"
                                        value={etapa.nomeEtapa}
                                        onChange={(e) => updateEtapaField(index, 'nomeEtapa', e.target.value)}
                                        placeholder="Nome da etapa (ex: Levantamento)"
                                        className="flex-1 bg-transparent border-b border-slate-600 focus:border-primary py-1 text-white text-sm outline-none transition-colors"
                                        required
                                    />
                                    <div className="w-16">
                                        <input
                                            type="number"
                                            value={etapa.ordem || index + 1}
                                            onChange={(e) => updateEtapaField(index, 'ordem', parseInt(e.target.value))}
                                            className="w-full bg-slate-700/50 border border-slate-600 rounded px-2 py-1 text-xs text-white text-center outline-none focus:border-primary"
                                            title="Ordem"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeEtapa(index)}
                                        className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"
                                        title="Remover etapa"
                                    >
                                        <span className="text-lg">🗑️</span>
                                    </button>
                                </div>
                            ))}

                            {etapas.length === 0 && (
                                <div className="text-center py-6 border-2 border-dashed border-slate-700 rounded-xl text-slate-500 text-sm">
                                    Nenhuma etapa padrão definida.
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex gap-4 pt-4">
                    <button
                        type="button"
                        onClick={() => navigate('/admin/tipos-projeto')}
                        disabled={loading}
                        className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg transition-all disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 py-3 bg-primary hover:bg-primary-dark text-white font-bold rounded-lg shadow-lg shadow-primary/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <div className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full"></div>
                                <span>Salvando...</span>
                            </>
                        ) : (
                            <span>Salvar</span>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default TipoProjetoFormPage;
