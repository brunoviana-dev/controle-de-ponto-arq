import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';
import { Projeto, RelatorioRecebimento } from '../../services/interfaces/types';
import { formatCurrency } from '../../utils/formatters';

const ClienteDashboardPage: React.FC = () => {
    const [projetos, setProjetos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        fetchProjetos();
    }, []);

    const fetchProjetos = async () => {
        setLoading(true);
        try {
            // Buscar projetos e dados financeiros via RPC ou join
            // Como as tabelas podem ter RLS, vamos buscar diretamente
            const { data, error } = await supabase
                .from('projetos')
                .select(`
                    id, 
                    nome_projeto, 
                    status, 
                    valor, 
                    numero_prestacoes,
                    projeto_parcelas (id, status),
                    contratos_gerados (arquivo_path)
                `);

            if (error) throw error;

            const processed = (data || []).map(p => {
                const parcelasPagas = p.projeto_parcelas?.filter((par: any) => par.status === 'recebido').length || 0;
                const contrato = p.contratos_gerados?.[0] || null;
                return {
                    ...p,
                    parcelasPagas,
                    contrato
                };
            });

            setProjetos(processed);
        } catch (err) {
            console.error('Erro ao buscar projetos:', err);
        } finally {
            setLoading(false);
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'nao_iniciado': return { text: 'Não Iniciado', color: 'bg-slate-500' };
            case 'em_andamento': return { text: 'Em Andamento', color: 'bg-blue-500' };
            case 'concluido': return { text: 'Concluído', color: 'bg-green-500' };
            case 'cancelado': return { text: 'Cancelado', color: 'bg-red-500' };
            default: return { text: status, color: 'bg-slate-500' };
        }
    };

    const handleDownloadContrato = async (e: React.MouseEvent, arquivoPath: string, nomeProjeto: string) => {
        e.stopPropagation(); // Evitar navegar para a página do projeto
        try {
            const { data, error } = await supabase.storage
                .from('contratos-gerados')
                .createSignedUrl(arquivoPath, 60);

            if (error) throw error;

            // Fetch the file and create a blob to force the filename
            const response = await fetch(data.signedUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${nomeProjeto}.docx`);
            document.body.appendChild(link);
            link.click();
            link.remove();

            // Clean up the object URL
            window.URL.revokeObjectURL(url);
        } catch (err) {
            alert('Erro ao baixar contrato');
        }
    };

    if (loading) return <div className="text-white">Carregando seus projetos...</div>;

    return (
        <div className="space-y-6">
            <header>
                <h1 className="text-2xl font-bold text-white">Meus Projetos</h1>
                <p className="text-slate-400">Acompanhe o andamento e pagamentos de suas obras</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projetos.length === 0 ? (
                    <div className="col-span-full py-12 text-center bg-surface border border-slate-700 rounded-xl">
                        <p className="text-slate-400">Nenhum projeto encontrado.</p>
                    </div>
                ) : (
                    projetos.map(projeto => {
                        const status = getStatusLabel(projeto.status);
                        return (
                            <div
                                key={projeto.id}
                                onClick={() => navigate(`/area-cliente/projeto/${projeto.id}`)}
                                className="bg-surface p-6 rounded-xl border border-slate-700 hover:border-primary/50 transition-all cursor-pointer group"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <h2 className="text-xl font-bold text-white group-hover:text-primary transition-colors">
                                        {projeto.nome_projeto}
                                    </h2>
                                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase text-white ${status.color}`}>
                                        {status.text}
                                    </span>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-400">Valor Total</span>
                                        <span className="text-white font-medium">{formatCurrency(projeto.valor || 0)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-400">Parcelas Pagas</span>
                                        <span className="text-white font-medium">
                                            {projeto.parcelasPagas} / {projeto.numero_prestacoes}
                                        </span>
                                    </div>

                                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                                        <div
                                            className="bg-primary h-full transition-all duration-500"
                                            style={{ width: `${(projeto.parcelasPagas / (projeto.numero_prestacoes || 1)) * 100}%` }}
                                        />
                                    </div>

                                    {projeto.contrato && (
                                        <button
                                            onClick={(e) => projeto.contrato?.arquivo_path && handleDownloadContrato(e, projeto.contrato.arquivo_path, projeto.nome_projeto)}
                                            className="w-full mt-4 flex items-center justify-center space-x-2 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg border border-slate-700 transition-colors"
                                        >
                                            <span>📥 Baixar Contrato</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default ClienteDashboardPage;
