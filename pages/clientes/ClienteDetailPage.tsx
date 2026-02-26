import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getClienteById } from '../../services/clientesService';
import { deleteProjeto, getProjetosByCliente } from '../../services/projetosService';
import ConfirmModal from '../../components/ConfirmModal';
import { Cliente, Projeto } from '../../services/interfaces/types';
import { formatCurrency, formatStatus, getStatusBadgeClass } from '../../utils/formatters';
import { gerarEUploadContrato } from '../../services/contratoService';

const ClienteDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [cliente, setCliente] = useState<Cliente | null>(null);
    const [projetos, setProjetos] = useState<Projeto[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [generatingContractId, setGeneratingContractId] = useState<string | null>(null);

    // Estados para o Modal de Confirmação
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [projetoParaExcluir, setProjetoParaExcluir] = useState<{ id: string, nome: string } | null>(null);

    useEffect(() => {
        if (id) {
            loadData(id);
        }
    }, [id]);

    const loadData = async (clienteId: string) => {
        try {
            setLoading(true);
            const [clienteData, projetosData] = await Promise.all([
                getClienteById(clienteId),
                getProjetosByCliente(clienteId)
            ]);

            if (clienteData) {
                setCliente(clienteData);
                setProjetos(projetosData);
            } else {
                setError('Cliente não encontrado');
            }
        } catch (err: any) {
            setError(err.message || 'Erro ao carregar dados');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteProjeto = (id: string, nome: string) => {
        setProjetoParaExcluir({ id, nome });
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDeleteProjeto = async () => {
        if (!projetoParaExcluir) return;

        const { id, nome } = projetoParaExcluir;

        try {
            setDeletingId(id);
            await deleteProjeto(id);
            // Atualizar lista localmente
            setProjetos(prev => prev.filter(p => p.id !== id));
            setIsDeleteModalOpen(false); // Fechar modal após sucesso
        } catch (err: any) {
            alert(`Erro ao excluir projeto "${nome}": ${err.message}`);
        } finally {
            setDeletingId(null);
            setProjetoParaExcluir(null);
        }
    };

    const handleGerarContrato = async (projetoId: string, nomeProjeto: string) => {
        try {
            setGeneratingContractId(projetoId);
            const downloadUrl = await gerarEUploadContrato(projetoId);

            const link = document.createElement('a');
            link.href = downloadUrl;
            link.setAttribute('download', `Contrato_${nomeProjeto}.docx`);
            document.body.appendChild(link);
            link.click();
            link.remove();

            alert('Contrato gerado com sucesso!');
        } catch (err: any) {
            alert('Erro ao gerar contrato: ' + err.message);
        } finally {
            setGeneratingContractId(null);
        }
    };

    if (loading) return <div className="p-6 text-slate-300">Carregando...</div>;
    if (error) return <div className="p-6 text-red-500">{error}</div>;
    if (!cliente) return null;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                    <Link to="/clientes" className="text-slate-400 hover:text-white">
                        &larr; Voltar
                    </Link>
                    <h1 className="text-2xl font-bold text-white mb-0">{cliente.nome}</h1>
                </div>
                <div className="space-x-2">
                    <Link
                        to={`/clientes/${cliente.id}/editar`}
                        className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-md transition duration-200"
                    >
                        Editar Cliente
                    </Link>
                </div>
            </div>

            {/* Detalhes do Cliente */}
            <div className="bg-surface rounded-lg border border-slate-700 p-6 mb-8">
                <h2 className="text-lg font-semibold text-white mb-4 border-b border-slate-700 pb-2">Dados Cadastrais</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-sm">
                    <div>
                        <span className="block text-slate-500 mb-1">Email</span>
                        <span className="text-slate-200">{cliente.email || '-'}</span>
                    </div>
                    <div>
                        <span className="block text-slate-500 mb-1">Telefone</span>
                        <span className="text-slate-200">{cliente.telefone}</span>
                    </div>
                    <div>
                        <span className="block text-slate-500 mb-1">CPF/CNPJ</span>
                        <span className="text-slate-200">{cliente.cpfCnpj || '-'}</span>
                    </div>
                    <div>
                        <span className="block text-slate-500 mb-1">Data de Nascimento</span>
                        <span className="text-slate-200">{cliente.dataNascimento || '-'}</span>
                    </div>
                    <div>
                        <span className="block text-slate-500 mb-1">Endereço</span>
                        <span className="text-slate-200">{cliente.endereco || '-'}</span>
                    </div>
                    <div>
                        <span className="block text-slate-500 mb-1">Status</span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cliente.ativo ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                            }`}>
                            {cliente.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                    </div>
                    <div className="md:col-span-3">
                        <span className="block text-slate-500 mb-1">Observações</span>
                        <span className="text-slate-200 whitespace-pre-wrap">{cliente.observacoes || '-'}</span>
                    </div>
                </div>
            </div>

            {/* Projetos */}
            <div className="bg-surface rounded-lg border border-slate-700 overflow-hidden">
                <div className="p-4 border-b border-slate-700 flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-white">Projetos</h2>
                    <Link
                        to={`/projetos/novo?clienteId=${cliente.id}`}
                        className="bg-primary hover:bg-primary-dark text-white px-3 py-1.5 rounded text-sm transition duration-200"
                    >
                        + Novo Projeto
                    </Link>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-300">
                        <thead className="bg-slate-800 text-slate-400 uppercase font-medium">
                            <tr>
                                <th className="px-6 py-3">Nome do Projeto</th>
                                <th className="px-6 py-3">Tipo</th>
                                <th className="px-6 py-3">Valor</th>
                                <th className="px-6 py-3">Pagamento</th>
                                <th className="px-6 py-3">Prestações</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3">Datas</th>
                                <th className="px-6 py-3 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {projetos.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-8 text-center text-slate-500">
                                        Nenhum projeto cadastrado para este cliente.
                                    </td>
                                </tr>
                            ) : (
                                projetos.map((projeto) => (
                                    <tr key={projeto.id} className="hover:bg-slate-800/50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-white">
                                            <div>{projeto.nomeProjeto}</div>
                                            {projeto.enderecoObra && <div className="text-xs text-slate-500">{projeto.enderecoObra}</div>}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-slate-200">{projeto.projetoTipo?.nome || '-'}</span>
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
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusBadgeClass(projeto.status)}`}>
                                                {formatStatus(projeto.status)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-xs">
                                            {projeto.dataInicio && <div className="mb-1">Início: {projeto.dataInicio}</div>}
                                            {projeto.dataPrevistaTermino && <div>Término: {projeto.dataPrevistaTermino}</div>}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleGerarContrato(projeto.id, projeto.nomeProjeto)}
                                                disabled={generatingContractId === projeto.id}
                                                className="inline-block text-xs px-2 py-1 rounded border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 transition-colors disabled:opacity-50 mr-2"
                                                title="Gerar Contrato"
                                            >
                                                {generatingContractId === projeto.id ? '...' : '📄'}
                                            </button>
                                            <Link
                                                to={`/projetos/${projeto.id}`}
                                                className="inline-block text-xs px-2 py-1 rounded border border-blue-500/30 text-blue-400 hover:bg-blue-500/10 transition-colors mr-2"
                                            >
                                                Ver
                                            </Link>
                                            <Link
                                                to={`/projetos/${projeto.id}/editar`}
                                                className="inline-block text-xs px-2 py-1 rounded border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 transition-colors mr-2"
                                            >
                                                Editar
                                            </Link>
                                            <button
                                                onClick={() => handleDeleteProjeto(projeto.id, projeto.nomeProjeto)}
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
                onConfirm={handleConfirmDeleteProjeto}
                title="Excluir Projeto"
                message={`Tem certeza que deseja excluir o projeto "${projetoParaExcluir?.nome}"? Esta ação também excluirá todas as parcelas e etapas associadas e NÃO pode ser desfeita.`}
                confirmText="Excluir"
                cancelText="Cancelar"
                isDanger={true}
            />
        </div>
    );
};

export default ClienteDetailPage;
