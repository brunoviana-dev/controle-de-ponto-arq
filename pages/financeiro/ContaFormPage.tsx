import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { contasPagarService } from '../../services/contasPagarService';
import { ContaPagar } from '../../services/interfaces/types';

const ContaFormPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const isEditing = Boolean(id);

    const [loading, setLoading] = useState(isEditing);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState<Omit<ContaPagar, 'id' | 'created_at'>>({
        descricao: '',
        categoria: '',
        valor: 0,
        data_vencimento: new Date().toISOString().split('T')[0],
        observacoes: '',
        recorrente: false
    });

    useEffect(() => {
        if (id) {
            const loadConta = async () => {
                try {
                    // Usar o novo método getById do service
                    const { data, error } = await contasPagarService.getById(id);
                    if (data) {
                        setFormData({
                            descricao: data.descricao,
                            categoria: data.categoria || '',
                            valor: data.valor,
                            data_vencimento: data.data_vencimento,
                            observacoes: data.observacoes || '',
                            recorrente: data.recorrente
                        });
                    }
                } catch (error) {
                    console.error('Erro ao carregar conta:', error);
                    navigate('/admin/financeiro/contas-pagar');
                } finally {
                    setLoading(false);
                }
            };
            loadConta();
        }
    }, [id]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (isEditing && id) {
                await contasPagarService.updateConta(id, formData);
            } else {
                await contasPagarService.createConta(formData);
            }
            navigate('/admin/financeiro/contas-pagar');
        } catch (error) {
            console.error('Erro ao salvar conta:', error);
            alert('Erro ao salvar os dados. Verifique o console.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div>
                <button
                    onClick={() => navigate('/admin/financeiro/contas-pagar')}
                    className="text-slate-400 hover:text-white transition-colors flex items-center gap-2 mb-4"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    Voltar para a lista
                </button>
                <h1 className="text-3xl font-bold text-white tracking-tight">
                    {isEditing ? 'Editar Conta' : 'Nova Conta a Pagar'}
                </h1>
                <p className="text-slate-400 mt-1">Prencha os dados do compromisso financeiro</p>
            </div>

            <form onSubmit={handleSubmit} className="bg-surface p-8 rounded-xl border border-slate-700 shadow-2xl space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-300 mb-1">Descrição *</label>
                        <input
                            type="text"
                            required
                            value={formData.descricao}
                            onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                            className="w-full px-4 py-2.5 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                            placeholder="Ex: Aluguel do Escritório"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Categoria</label>
                        <input
                            type="text"
                            value={formData.categoria}
                            onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                            className="w-full px-4 py-2.5 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                            placeholder="Ex: Infraestrutura, Pessoal, etc."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Valor (R$) *</label>
                        <input
                            type="number"
                            step="0.01"
                            required
                            value={formData.valor || ''}
                            onChange={(e) => setFormData({ ...formData, valor: parseFloat(e.target.value) })}
                            className="w-full px-4 py-2.5 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                            placeholder="0,00"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Data de Vencimento *</label>
                        <input
                            type="date"
                            required
                            value={formData.data_vencimento}
                            onChange={(e) => setFormData({ ...formData, data_vencimento: e.target.value })}
                            className="w-full px-4 py-2.5 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                        />
                    </div>

                    <div className="flex items-center gap-3 md:pt-8">
                        <input
                            type="checkbox"
                            id="recorrente"
                            checked={formData.recorrente}
                            onChange={(e) => setFormData({ ...formData, recorrente: e.target.checked })}
                            className="w-5 h-5 rounded border-slate-600 bg-slate-800 text-primary focus:ring-offset-slate-900 focus:ring-primary"
                        />
                        <label htmlFor="recorrente" className="text-sm font-medium text-slate-300 cursor-pointer">
                            Esta é uma conta recorrente?
                        </label>
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-300 mb-1">Observações</label>
                        <textarea
                            rows={3}
                            value={formData.observacoes}
                            onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                            className="w-full px-4 py-2.5 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none"
                            placeholder="Detalhes adicionais sobre este pagamento..."
                        />
                    </div>
                </div>

                <div className="flex gap-4 pt-4">
                    <button
                        type="button"
                        onClick={() => navigate('/admin/financeiro/contas-pagar')}
                        className="flex-1 py-3 border border-slate-600 text-slate-300 font-bold rounded-lg hover:bg-slate-800 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={saving}
                        className="flex-1 py-3 bg-primary hover:bg-primary-dark text-white font-bold rounded-lg transition-colors shadow-lg shadow-primary/20 disabled:opacity-50"
                    >
                        {saving ? 'Salvando...' : 'Salvar Conta'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ContaFormPage;
