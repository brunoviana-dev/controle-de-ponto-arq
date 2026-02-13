import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createCliente, getClienteById, updateCliente } from '../../services/clientesService';

const ClienteFormPage: React.FC = () => {
    const { id } = useParams();
    const isEditing = !!id;
    const navigate = useNavigate();

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        nome: '',
        email: '',
        telefone: '',
        cpfCnpj: '',
        dataNascimento: '',
        endereco: '',
        observacoes: '',
        ativo: true
    });

    useEffect(() => {
        if (isEditing && id) {
            loadCliente(id);
        }
    }, [id, isEditing]);

    const loadCliente = async (clienteId: string) => {
        try {
            setLoading(true);
            const cliente = await getClienteById(clienteId);
            if (cliente) {
                setFormData({
                    nome: cliente.nome,
                    email: cliente.email || '',
                    telefone: cliente.telefone,
                    cpfCnpj: cliente.cpfCnpj || '',
                    dataNascimento: cliente.dataNascimento || '',
                    endereco: cliente.endereco || '',
                    observacoes: cliente.observacoes || '',
                    ativo: cliente.ativo
                });
            } else {
                setError('Cliente não encontrado');
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!formData.nome || !formData.telefone) {
            setError('Nome e Telefone são obrigatórios.');
            return;
        }

        try {
            setSaving(true);
            // Ensure empty strings are treated as checkable or passed as undefined if needed,
            // but service handles them.

            const dataToSave = {
                ...formData,
                // Optional fields mapped correctly if empty string should be undefined or null? 
                // Supabase handles empty string as empty string text. That's fine.
            };

            if (isEditing && id) {
                await updateCliente(id, dataToSave);
            } else {
                await createCliente(dataToSave);
            }
            navigate('/clientes');
        } catch (err: any) {
            setError(err.message || 'Erro ao salvar cliente');
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    if (loading) return <div className="p-6 text-slate-300">Carregando...</div>;

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold text-white mb-6">
                {isEditing ? 'Editar Cliente' : 'Novo Cliente'}
            </h1>

            {error && (
                <div className="bg-red-500/10 border border-red-500 text-red-500 p-4 rounded-md mb-6">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="bg-surface p-6 rounded-lg border border-slate-700 space-y-4">

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Nome *</label>
                        <input
                            type="text"
                            name="nome"
                            value={formData.nome}
                            onChange={handleChange}
                            className="w-full bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-white focus:border-primary focus:outline-none"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Telefone *</label>
                        <input
                            type="text"
                            name="telefone"
                            value={formData.telefone}
                            onChange={handleChange}
                            className="w-full bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-white focus:border-primary focus:outline-none"
                            required
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Email</label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            className="w-full bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-white focus:border-primary focus:outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">CPF/CNPJ</label>
                        <input
                            type="text"
                            name="cpfCnpj"
                            value={formData.cpfCnpj}
                            onChange={handleChange}
                            className="w-full bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-white focus:border-primary focus:outline-none"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Data de Nascimento</label>
                        <input
                            type="date"
                            name="dataNascimento"
                            value={formData.dataNascimento}
                            onChange={handleChange}
                            className="w-full bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-white focus:border-primary focus:outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Endereço</label>
                        <input
                            type="text"
                            name="endereco"
                            value={formData.endereco}
                            onChange={handleChange}
                            className="w-full bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-white focus:border-primary focus:outline-none"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Observações</label>
                    <textarea
                        name="observacoes"
                        value={formData.observacoes}
                        onChange={handleChange}
                        rows={3}
                        className="w-full bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-white focus:border-primary focus:outline-none"
                    ></textarea>
                </div>

                {isEditing && (
                    <div className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            name="ativo"
                            checked={formData.ativo}
                            onChange={(e) => setFormData(prev => ({ ...prev, ativo: e.target.checked }))}
                            className="form-checkbox h-4 w-4 bg-slate-800 border-slate-600 text-primary rounded focus:ring-primary"
                        />
                        <label className="text-sm font-medium text-slate-300">Cliente Ativo</label>
                    </div>
                )}

                <div className="flex justify-end space-x-3 pt-4 border-t border-slate-700">
                    <button
                        type="button"
                        onClick={() => navigate('/clientes')}
                        className="px-4 py-2 text-slate-300 hover:text-white transition-colors"
                        disabled={saving}
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        className="bg-primary hover:bg-primary-dark text-white px-6 py-2 rounded-md transition duration-200 disabled:opacity-50"
                        disabled={saving}
                    >
                        {saving ? 'Salvando...' : 'Salvar'}
                    </button>
                </div>

            </form>
        </div>
    );
};

export default ClienteFormPage;
