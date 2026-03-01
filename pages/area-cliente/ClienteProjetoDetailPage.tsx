import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';
import { Projeto, ProjetoParcela } from '../../services/interfaces/types';
import { formatCurrency, formatDate } from '../../utils/formatters';

const ClienteProjetoDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [projeto, setProjeto] = useState<Projeto | null>(null);
    const [parcelas, setParcelas] = useState<ProjetoParcela[]>([]);
    const [contrato, setContrato] = useState<{ arquivo_path: string, data_geracao: string } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) {
            fetchProjetoDetails();
        }
    }, [id]);

    const fetchProjetoDetails = async () => {
        setLoading(true);
        try {
            // 1. Dados do Projeto
            const { data: projData, error: projError } = await supabase
                .from('projetos')
                .select('*')
                .eq('id', id)
                .single();
            if (projError) throw projError;
            setProjeto(projData);

            // 2. Parcelas
            const { data: parcData, error: parcError } = await supabase
                .from('projeto_parcelas')
                .select('*')
                .eq('projeto_id', id)
                .order('numero_parcela');
            if (parcError) throw parcError;
            setParcelas(parcData || []);

            // 3. Contrato (Pega apenas o único contrato ativo)
            const { data: contData, error: contError } = await supabase
                .from('contratos_gerados')
                .select('*')
                .eq('projeto_id', id)
                .single();
            if (contError && contError.code !== 'PGRST116') throw contError; // Ignora erro de "não encontrado"
            setContrato(contData);

        } catch (err) {
            console.error('Erro ao buscar detalhes do projeto:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadContrato = async (path: string) => {
        if (!projeto) return;
        try {
            const { data, error } = await supabase.storage
                .from('contratos-gerados')
                .createSignedUrl(path, 60);

            if (error) throw error;

            // Fetch the file and create a blob to force the filename
            const response = await fetch(data.signedUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${projeto.nome_projeto}.docx`);
            document.body.appendChild(link);
            link.click();
            link.remove();

            // Clean up the object URL
            window.URL.revokeObjectURL(url);
        } catch (err) {
            alert('Erro ao gerar link de download');
        }
    };

    if (loading) return <div className="text-white">Carregando detalhes...</div>;
    if (!projeto) return <div className="text-white">Projeto não encontrado.</div>;

    return (
        <div className="space-y-8">
            <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <button
                        onClick={() => navigate('/area-cliente')}
                        className="text-primary hover:underline text-sm mb-2 flex items-center gap-1"
                    >
                        ← Voltar para Meus Projetos
                    </button>
                    <h1 className="text-3xl font-bold text-white">{projeto.nome_projeto}</h1>
                    <p className="text-slate-400">ID: {projeto.id}</p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-slate-400 text-sm">Status:</span>
                    <span className="px-3 py-1 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-full text-xs font-bold uppercase">
                        {projeto.status.replace('_', ' ')}
                    </span>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Coluna Principal: Parcelas */}
                <div className="lg:col-span-2 space-y-6">
                    <section className="bg-surface border border-slate-700 rounded-xl overflow-hidden shadow-sm">
                        <div className="p-6 border-b border-slate-700">
                            <h2 className="text-xl font-bold text-white">Parcelas do Projeto</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-800/50">
                                        <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">#</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Valor</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Vencimento</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700">
                                    {parcelas.map(p => (
                                        <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                                            <td className="px-6 py-4 text-white font-medium">{p.numeroParcela}</td>
                                            <td className="px-6 py-4 text-white">{formatCurrency(p.valorParcela)}</td>
                                            <td className="px-6 py-4 text-slate-300">
                                                {p.dataVencimento ? formatDate(p.dataVencimento) : 'A definir'}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${p.status === 'recebido' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                                                    p.status === 'atrasado' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                                                        'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30'
                                                    }`}>
                                                    {p.status === 'recebido' ? 'Pago' : p.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </div>

                {/* Coluna Lateral: Contratos e Info */}
                <div className="space-y-6">
                    <section className="bg-surface border border-slate-700 rounded-xl p-6 shadow-sm">
                        <h2 className="text-xl font-bold text-white mb-4">Informações Financeiras</h2>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center pb-3 border-b border-slate-700">
                                <span className="text-slate-400">Valor Total</span>
                                <span className="text-white font-bold text-lg">{formatCurrency(projeto.valor || 0)}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-400">Forma de Pagamento</span>
                                <span className="text-white">{projeto.formaPagamento || 'Não informada'}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-400">Total de Parcelas</span>
                                <span className="text-white">{projeto.numeroPrestacoes}</span>
                            </div>
                        </div>
                    </section>

                    <section className="bg-surface border border-slate-700 rounded-xl p-6 shadow-sm">
                        <h2 className="text-xl font-bold text-white mb-4">Contrato do Projeto</h2>
                        {!contrato ? (
                            <p className="text-slate-500 text-sm">Contrato não disponível para download.</p>
                        ) : (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium text-white">Contrato de Prestação de Serviços</span>
                                        <span className="text-[10px] text-slate-500">Gerado em: {formatDate(contrato.data_geracao)}</span>
                                    </div>
                                    <button
                                        onClick={() => handleDownloadContrato(contrato.arquivo_path)}
                                        className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
                                    >
                                        <span>📥</span>
                                        Baixar
                                    </button>
                                </div>
                            </div>
                        )}
                    </section>
                </div>
            </div>
        </div>
    );
};

export default ClienteProjetoDetailPage;
