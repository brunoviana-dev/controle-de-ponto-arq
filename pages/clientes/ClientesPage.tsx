import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Cliente } from '../../services/interfaces/types';
import { getClientes, toggleClienteAtivo } from '../../services/clientesService';

const ClientesPage: React.FC = () => {
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        loadClientes();
    }, []);

    const loadClientes = async () => {
        try {
            setLoading(true);
            const data = await getClientes();
            setClientes(data);
            setError('');
        } catch (err: any) {
            setError(err.message || 'Erro ao carregar clientes');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleAtivo = async (id: string, ativoAtual: boolean) => {
        try {
            await toggleClienteAtivo(id, !ativoAtual);
            // Atualizar lista localmente para evitar reload
            setClientes(prev => prev.map(c =>
                c.id === id ? { ...c, ativo: !ativoAtual } : c
            ));
        } catch (err: any) {
            alert(`Erro ao alterar status: ${err.message}`);
        }
    };

    const filteredClientes = clientes.filter(c =>
        c.nome.toLowerCase().includes(search.toLowerCase()) ||
        c.email?.toLowerCase().includes(search.toLowerCase()) ||
        c.telefone.includes(search)
    );

    if (loading) return <div className="p-6 text-slate-300">Carregando...</div>;

    return (
        <div className="p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Clientes</h1>
                    <p className="text-slate-400">Gerencie seus clientes e contratantes</p>
                </div>
                <Link
                    to="/clientes/novo"
                    className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-md transition duration-200 flex items-center space-x-2"
                >
                    <span>+ Novo Cliente</span>
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
                        placeholder="Buscar por nome, email ou telefone..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full md:w-96 bg-slate-800 border border-slate-600 rounded-md px-4 py-2 text-white focus:outline-none focus:border-primary placeholder-slate-500"
                    />
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-300">
                        <thead className="bg-slate-800 text-slate-400 uppercase font-medium">
                            <tr>
                                <th className="px-6 py-3">Nome</th>
                                <th className="px-6 py-3">Contato</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {filteredClientes.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                                        Nenhum cliente encontrado.
                                    </td>
                                </tr>
                            ) : (
                                filteredClientes.map((cliente) => (
                                    <tr key={cliente.id} className="hover:bg-slate-800/50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-white">
                                            <div>{cliente.nome}</div>
                                            {cliente.cpfCnpj && <div className="text-xs text-slate-500">{cliente.cpfCnpj}</div>}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span>{cliente.telefone}</span>
                                                <span className="text-xs text-slate-500">{cliente.email}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cliente.ativo
                                                ? 'bg-green-500/10 text-green-500'
                                                : 'bg-red-500/10 text-red-500'
                                                }`}>
                                                {cliente.ativo ? 'Ativo' : 'Inativo'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right space-x-2">
                                            <button
                                                onClick={() => handleToggleAtivo(cliente.id, cliente.ativo)}
                                                className={`text-xs px-2 py-1 rounded border ${cliente.ativo
                                                    ? 'border-red-500/30 text-red-400 hover:bg-red-500/10'
                                                    : 'border-green-500/30 text-green-400 hover:bg-green-500/10'
                                                    }`}
                                            >
                                                {cliente.ativo ? 'Desativar' : 'Ativar'}
                                            </button>
                                            <Link
                                                to={`/clientes/${cliente.id}`}
                                                className="inline-block text-xs px-2 py-1 rounded border border-blue-500/30 text-blue-400 hover:bg-blue-500/10 transition-colors"
                                            >
                                                Ver
                                            </Link>
                                            <Link
                                                to={`/clientes/${cliente.id}/editar`}
                                                className="inline-block text-xs px-2 py-1 rounded border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 transition-colors"
                                            >
                                                Editar
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ClientesPage;
