import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ProjetoTipo } from '../../services/interfaces/types';
import { getTipos, getTemplateUrl } from '../../services/projetoTiposService';

const TiposProjetoPage: React.FC = () => {
    const [tipos, setTipos] = useState<ProjetoTipo[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = async () => {
        try {
            setLoading(true);
            const data = await getTipos();
            setTipos(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

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
                    <h1 className="text-2xl font-bold text-white">Tipos de Projeto</h1>
                    <p className="text-slate-400">Gerencie as categorias de projetos e modelos de contrato</p>
                </div>
                <Link
                    to="novo"
                    className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-md transition-colors flex items-center gap-2 shadow-lg shadow-primary/20"
                >
                    <span>+</span> Novo Tipo
                </Link>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500 text-red-500 p-4 rounded-md">
                    {error}
                </div>
            )}

            <div className="bg-surface border border-slate-700 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-800/50 border-b border-slate-700">
                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Nome</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Template</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                        {tipos.map((tipo) => (
                            <tr key={tipo.id} className="hover:bg-slate-800/30 transition-colors">
                                <td className="px-6 py-4">
                                    <span className="text-white font-medium">{tipo.nome}</span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${tipo.ativo
                                        ? 'bg-emerald-500/20 text-emerald-400'
                                        : 'bg-slate-500/20 text-slate-400'
                                        }`}>
                                        {tipo.ativo ? 'Ativo' : 'Inativo'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    {tipo.contratoTemplatePath && (
                                        <a
                                            href={getTemplateUrl(tipo.contratoTemplatePath)}
                                            download={`template-${tipo.nome.toLowerCase().replace(/\s+/g, '-')}.docx`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center justify-center w-8 h-8 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                                            title="Baixar Template (.docx)"
                                        >
                                            <span className="text-lg">📄</span>
                                        </a>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <Link
                                        to={`${tipo.id}/editar`}
                                        className="inline-block text-xs px-2 py-1 rounded border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 transition-colors"
                                    >
                                        Editar
                                    </Link>
                                </td>
                            </tr>
                        ))}

                        {tipos.length === 0 && (
                            <tr>
                                <td colSpan={4} className="px-6 py-10 text-center text-slate-500">
                                    Nenhum tipo de projeto cadastrado.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default TiposProjetoPage;
