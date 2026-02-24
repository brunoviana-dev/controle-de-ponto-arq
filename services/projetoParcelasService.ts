import { supabase } from './supabaseClient';
import { ProjetoParcela, RelatorioRecebimento, UserRole } from './interfaces/types';
import { getCurrentUser } from './authService';

const ensureAdmin = () => {
    const user = getCurrentUser();
    if (user?.role !== UserRole.ADMIN) {
        throw new Error('Acesso negado: Apenas administradores podem realizar esta ação.');
    }
};

/**
 * Gera parcelas automaticamente para um projeto
 */
export const gerarParcelasAutomaticas = async (projetoId: string, valorTotal: number, numParcelas: number): Promise<void> => {
    ensureAdmin();

    if (numParcelas < 0) return;

    // Buscar parcelas existentes
    const { data: existing, error: fetchError } = await supabase
        .from('projeto_parcelas')
        .select('*')
        .eq('projeto_id', projetoId)
        .order('numero_parcela', { ascending: true });

    if (fetchError) throw new Error(`Erro ao verificar parcelas existentes: ${fetchError.message}`);

    const recebidas = (existing || []).filter(p => p.status === 'recebido');
    const valorRecebido = recebidas.reduce((acc, p) => acc + Number(p.valor_parcela), 0);

    // Se o novo número de parcelas for menor ou igual às já recebidas,
    // apenas removemos as pendentes e mantemos as recebidas.
    if (numParcelas <= recebidas.length) {
        const { error: deleteError } = await supabase
            .from('projeto_parcelas')
            .delete()
            .eq('projeto_id', projetoId)
            .eq('status', 'pendente');

        if (deleteError) throw new Error(`Erro ao ajustar parcelas: ${deleteError.message}`);
        return;
    }

    // Caso contrário, removemos as pendentes e recalculamos o saldo
    const { error: deleteError } = await supabase
        .from('projeto_parcelas')
        .delete()
        .eq('projeto_id', projetoId)
        .eq('status', 'pendente');

    if (deleteError) throw new Error(`Erro ao limpar parcelas pendentes: ${deleteError.message}`);

    const valorRestante = Number((valorTotal - valorRecebido).toFixed(2));
    const numNovasParcelas = numParcelas - recebidas.length;

    if (valorRestante <= 0) return;

    const valorBase = Math.floor((valorRestante / numNovasParcelas) * 100) / 100;
    const valorUltima = Number((valorRestante - (valorBase * (numNovasParcelas - 1))).toFixed(2));

    const novasParcelas = [];
    for (let i = 1; i <= numNovasParcelas; i++) {
        novasParcelas.push({
            projeto_id: projetoId,
            numero_parcela: recebidas.length + i,
            valor_parcela: i === numNovasParcelas ? valorUltima : valorBase,
            status: 'pendente'
        });
    }

    const { error: insertError } = await supabase
        .from('projeto_parcelas')
        .insert(novasParcelas);

    if (insertError) throw new Error(`Erro ao gerar novas parcelas: ${insertError.message}`);
};


/**
 * Obtém o relatório consolidado de recebimentos
 */
export const getRelatorioRecebimento = async (): Promise<RelatorioRecebimento[]> => {
    ensureAdmin();

    const { data, error } = await supabase
        .from('projetos')
        .select(`
            *,
            cliente:clientes(nome),
            parcelas:projeto_parcelas(status, valor_parcela)
        `)
        .order('created_at', { ascending: false });

    if (error) throw new Error(`Erro ao buscar relatório: ${error.message}`);

    return (data || []).map(p => {
        const parcelas = p.parcelas || [];
        const recebidas = parcelas.filter((par: any) => par.status === 'recebido');
        const valorRecebido = recebidas.reduce((acc: number, par: any) => acc + Number(par.valor_parcela), 0);

        // Usar o valor retornado do banco, independente do nome (se p.valor não existir, tenta p.valor_projeto ou 0)
        const valorTotal = Number(p.valor || (p as any).valor_projeto || 0);
        const numPrestacoes = Number(p.numero_prestacoes || (p as any).numero_parcelas || 0);

        return {
            projetoId: p.id,
            nomeProjeto: p.nome_projeto,
            clienteNome: (p.cliente as any)?.nome || 'Cliente não informado',
            valorTotal: valorTotal,
            numeroParcelas: numPrestacoes,
            parcelasRecebidas: recebidas.length,
            valorRecebido: valorRecebido,
            valorEmAberto: valorTotal - valorRecebido,
            todasPagas: parcelas.length > 0 && parcelas.every((par: any) => par.status === 'recebido')
        };
    });
};

// Função registrarRecebimentoParcela removida pois será substituída por registrarPagamentoMultiplasParcelas


/**
 * Obtém todas as parcelas de um projeto específico
 */
export const getParcelasProjeto = async (projetoId: string): Promise<ProjetoParcela[]> => {
    ensureAdmin();

    const { data, error } = await supabase
        .from('projeto_parcelas')
        .select('*')
        .eq('projeto_id', projetoId)
        .order('numero_parcela', { ascending: true });

    if (error) throw new Error(`Erro ao buscar parcelas do projeto: ${error.message}`);

    // Mapear snake_case para camelCase
    return (data || []).map(p => ({
        id: p.id,
        projetoId: p.projeto_id,
        numeroParcela: p.numero_parcela,
        valorParcela: p.valor_parcela,
        dataVencimento: p.data_vencimento,
        dataRecebimento: p.data_recebimento,
        status: p.status,
        createdAt: p.created_at,
        updatedAt: p.updated_at
    }));
};

/**
 * Registra o recebimento de múltiplas parcelas
 */
export const registrarPagamentoMultiplasParcelas = async (parcelaIds: string[]): Promise<void> => {
    ensureAdmin();

    if (parcelaIds.length === 0) return;

    const { error } = await supabase
        .from('projeto_parcelas')
        .update({
            status: 'recebido',
            data_recebimento: new Date().toISOString().split('T')[0]
        })
        .in('id', parcelaIds);

    if (error) throw new Error(`Erro ao registrar recebimentos: ${error.message}`);
};

