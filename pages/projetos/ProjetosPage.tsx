import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Projeto } from '../../services/interfaces/types';
import { deleteProjeto, getProjetos } from '../../services/projetosService';
import ConfirmModal from '../../components/ConfirmModal';
import { formatCurrency, formatStatus, getStatusBadgeClass } from '../../utils/formatters';

const ProjetosPage: React.FC = () => {
    const [projetos, setProjetos] = useState<Projeto[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Estados para o Modal de Confirmação
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [projetoParaExcluir, setProjetoParaExcluir] = useState<{ id: string, nome: string } | null>(null);

    useEffect(() => {
        loadProjetos();
    }, []);

    const loadProjetos = async () => {
        try {
            setLoading(true);
            const data = await getProjetos();
            setProjetos(data);
            setError('');
        } catch (err: any) {
            setError(err.message || 'Erro ao carregar projetos');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = (id: string, nome: string) => {
        setProjetoParaExcluir({ id, nome });
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!projetoParaExcluir) return;

        const { id, nome } = projetoParaExcluir;

        try {
            setDeletingId(id);
            await deleteProjeto(id);
            // Atualizar lista localmente
            setProjetos(prev => prev.filter(p => p.id !== id));
        } catch (err: any) {
            alert(`Erro ao excluir projeto "${nome}": ${err.message}`);
        } finally {
            setDeletingId(null);
            setProjetoParaExcluir(null);
        }
    };

    const filteredProjetos = projetos.filter(p =>
        p.nomeProjeto.toLowerCase().includes(search.toLowerCase()) ||
        p.cliente?.nome?.toLowerCase().includes(search.toLowerCase()) ||
        p.status.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) return <div className="p-6 text-slate-300">Carregando...</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Projetos</h1>
                    <p className="text-slate-400">Gerencie todos os projetos do escritório</p>
                </div>
                <Link
                    to="/projetos/novo"
                    className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-md transition duration-200 flex items-center space-x-2"
                >
                    <span>+ Novo Projeto</span>
                </Link>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500 text-red-500 p-4 rounded-md mb-6">
                    {error}
                </div>
            )}

            <div className="bg-surface rounded-lg border border-slate-700 overflow-hidden">
                <div className="p-4 border-b border-slate-700">
                    <input
                        type="text"
                        placeholder="Buscar por projeto, cliente ou status..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full md:w-96 bg-slate-800 border border-slate-600 rounded-md px-4 py-2 text-white focus:outline-none focus:border-primary placeholder-slate-500"
                    />
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-300">
                        <thead className="bg-slate-800 text-slate-400 uppercase font-medium">
                            <tr>
                                <th className="px-6 py-3">Projeto</th>
                                <th className="px-6 py-3">Cliente</th>
                                <th className="px-6 py-3">Valor</th>
                                <th className="px-6 py-3">Pagamento</th>
                                <th className="px-6 py-3">Prestações</th>
                                <th className="px-6 py-3 text-center">Status</th>
                                <th className="px-6 py-3 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {filteredProjetos.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                                        Nenhum projeto encontrado.
                                    </td>
                                </tr>
                            ) : (
                                filteredProjetos.map((projeto) => (
                                    <tr key={projeto.id} className="hover:bg-slate-800/50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-white">
                                            <div>{projeto.nomeProjeto}</div>
                                            {projeto.enderecoObra && <div className="text-xs text-slate-500">{projeto.enderecoObra}</div>}
                                        </td>
                                        <td className="px-6 py-4">
                                            {projeto.cliente ? (
                                                <Link to={`/clientes/${projeto.clienteId}`} className="hover:text-primary transition-colors">
                                                    {projeto.cliente.nome}
                                                </Link>
                                            ) : (
                                                <span className="text-slate-500">Cliente Removido</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-white font-medium">{formatCurrency(projeto.valor)}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-slate-300">{projeto.formaPagamento || '-'}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-slate-300">
                                                {projeto.numeroPrestacoes === 0 ? 'À Vista' : `${projeto.numeroPrestacoes}x`}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-2 py-1 rounded text-xs inline-block font-medium ${getStatusBadgeClass(projeto.status)}`}>
                                                {formatStatus(projeto.status)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right space-x-2">
                                            <Link
                                                to={`/projetos/${projeto.id}`}
                                                className="inline-block text-xs px-2 py-1 rounded border border-blue-500/30 text-blue-400 hover:bg-blue-500/10 transition-colors"
                                            >
                                                Ver
                                            </Link>
                                            <Link
                                                to={`/projetos/${projeto.id}/editar`}
                                                className="inline-block text-xs px-2 py-1 rounded border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 transition-colors"
                                            >
                                                Editar
                                            </Link>
                                            <button
                                                onClick={() => handleDelete(projeto.id, projeto.nomeProjeto)}
                                                disabled={deletingId === projeto.id}
                                                className="inline-block text-xs px-2 py-1 rounded border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                                            >
                                                {deletingId === projeto.id ? 'Excluindo...' : 'Deletar'}
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
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Excluir Projeto"
                message={`Tem certeza que deseja excluir o projeto "${projetoParaExcluir?.nome}"? Esta ação também excluirá todas as parcelas e etapas associadas e NÃO pode ser desfeita.`}
                confirmText="Excluir"
                cancelText="Cancelar"
                isDanger={true}
            />
        </div>
    );
};

export default ProjetosPage;
