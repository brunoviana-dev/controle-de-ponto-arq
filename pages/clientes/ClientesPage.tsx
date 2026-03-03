import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Cliente } from '../../services/interfaces/types';
import { getClientes, toggleClienteAtivo, vincularAuthAoCliente } from '../../services/clientesService';

const ClientesPage: React.FC = () => {
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [creatingLogin, setCreatingLogin] = useState(false);
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

    const handleCreateLogin = async () => {
        if (!selectedCliente || !password) return;

        if (!selectedCliente.email) {
            alert('Este cliente não possui um e-mail cadastrado. Por favor, edite o cliente e adicione um e-mail antes de criar o login.');
            return;
        }

        try {
            setCreatingLogin(true);
            const authUserId = await vincularAuthAoCliente(selectedCliente.id, selectedCliente.email, password);

            // Atualizar estado local
            setClientes(prev => prev.map(c =>
                c.id === selectedCliente.id ? { ...c, authUserId } : c
            ));

            alert('Login criado/atualizado com sucesso!');
            setSelectedCliente(null);
            setPassword('');
        } catch (err: any) {
            alert(`Erro ao criar login: ${err.message}`);
        } finally {
            setCreatingLogin(false);
        }
    };

    const filteredClientes = clientes.filter(c =>
        c.nome.toLowerCase().includes(search.toLowerCase()) ||
        c.email?.toLowerCase().includes(search.toLowerCase()) ||
        c.telefone.includes(search)
    );

    if (loading) return <div className="p-6 text-slate-300">Carregando...</div>;

    return (
        <div className="space-y-6">
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
                                <th className="px-6 py-3">Origem</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3 text-center">Login</th>
                                <th className="px-6 py-3 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {filteredClientes.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
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
                                            <span className={`text-xs px-2 py-1 rounded bg-slate-700/50 text-slate-400 border border-slate-600/50 uppercase font-bold tracking-wider`}>
                                                {cliente.origem || 'direto'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cliente.ativo
                                                ? 'bg-green-500/10 text-green-500'
                                                : 'bg-red-500/10 text-red-500'
                                                }`}>
                                                {cliente.ativo ? 'Ativo' : 'Inativo'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                onClick={() => setSelectedCliente(cliente)}
                                                className={`transition-colors p-1.5 rounded-full hover:bg-slate-700 ${cliente.authUserId ? 'text-green-500' : 'text-slate-500 hover:text-white'}`}
                                                title={cliente.authUserId ? "Gerenciar Login" : "Criar Login"}
                                            >
                                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M2 21a8 8 0 0 1 13.292-6" />
                                                    <circle cx="10" cy="8" r="5" />
                                                    <path d="m21 8.5 1.5 1.5" />
                                                    <path d="M19 10.5 20.5 12" />
                                                    <path d="m17 12.5 1.5 1.5" />
                                                    <path d="m15.5 14 3-3 3.5 3.5-3 3-3.5-3.5Z" />
                                                </svg>
                                            </button>
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

            {/* Modal de Criação de Login */}
            {selectedCliente && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-surface w-full max-w-md p-6 rounded-xl border border-slate-700 shadow-2xl animate-in fade-in zoom-in duration-200">
                        <h2 className="text-xl font-bold text-white mb-2">Login de Acesso</h2>
                        <p className="text-slate-400 text-sm mb-6">
                            Defina ou altere a senha para o cliente <strong>{selectedCliente.nome}</strong> acessar a área restrita.
                        </p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">E-mail do Cliente</label>
                                <input
                                    type="text"
                                    disabled
                                    value={selectedCliente.email || ''}
                                    className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-500 cursor-not-allowed"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Senha de Acesso</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        autoFocus
                                        placeholder="Mínimo 6 caracteres"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !creatingLogin && password.length >= 6) {
                                                handleCreateLogin();
                                            }
                                        }}
                                        className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all pr-12"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors p-1"
                                        title={showPassword ? "Ocultar senha" : "Ver senha"}
                                    >
                                        {showPassword ? (
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                                            </svg>
                                        ) : (
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-8">
                            <button
                                onClick={() => {
                                    setSelectedCliente(null);
                                    setPassword('');
                                    setShowPassword(false);
                                }}
                                className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleCreateLogin}
                                disabled={creatingLogin || password.length < 6}
                                className="px-6 py-2 bg-primary hover:bg-primary-dark text-white font-bold rounded-lg transition-colors shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {creatingLogin ? 'Salvando...' : 'Confirmar e Salvar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClientesPage;
