import { supabase } from './supabaseClient';
import { ProjetoEtapa } from './interfaces/types';
import { getCurrentUser } from './authService';

const ensureAdmin = () => {
    const user = getCurrentUser();
    if (user?.role !== 'admin') {
        throw new Error('Acesso negado: Apenas administradores podem realizar esta ação.');
    }
};

/**
 * Sincroniza o status do projeto com base nas suas etapas
 */
const syncProjetoStatus = async (projetoId: string) => {
    const { data: etapas, error: errorEtapas } = await supabase
        .from('projeto_etapas')
        .select('status')
        .eq('projeto_id', projetoId);

    if (errorEtapas || !etapas) return;

    let novoStatus: 'planejamento' | 'em_andamento' | 'concluido' | 'cancelado' = 'planejamento';

    if (etapas.length > 0) {
        const total = etapas.length;
        const concluidas = etapas.filter(e => e.status === 'concluido').length;
        const emAndamento = etapas.filter(e => e.status === 'em_andamento').length;
        const canceladas = etapas.filter(e => e.status === 'cancelado').length;
        const naoIniciadas = etapas.filter(e => e.status === 'nao_iniciado').length;

        if (canceladas === total) {
            novoStatus = 'cancelado';
        } else if (concluidas + canceladas === total) {
            novoStatus = 'concluido';
        } else if (emAndamento > 0 || (naoIniciadas < total && concluidas > 0)) {
            novoStatus = 'em_andamento';
        } else {
            novoStatus = 'planejamento';
        }
    }

    await supabase
        .from('projetos')
        .update({ status: novoStatus, updated_at: new Date().toISOString() })
        .eq('id', projetoId);

    return novoStatus;
};

/**
 * Retorna as etapas de um projeto
 */
export const getEtapasByProjeto = async (projetoId: string): Promise<ProjetoEtapa[]> => {
    const { data, error } = await supabase
        .from('projeto_etapas')
        .select(`
            *,
            colaborador:colaboradores(nome)
        `)
        .eq('projeto_id', projetoId)
        .order('ordem', { ascending: true });

    if (error) {
        throw new Error(`Erro ao buscar etapas do projeto: ${error.message}`);
    }

    return (data || []).map(e => ({
        id: e.id,
        projetoId: e.projeto_id,
        nomeEtapa: e.nome_etapa,
        ordem: e.ordem,
        dataInicioPrevista: e.data_inicio_prevista,
        dataFimPrevista: e.data_fim_prevista,
        status: e.status,
        colaboradorId: e.colaborador_id,
        createdAt: e.created_at,
        updatedAt: e.updated_at,
        colaborador: e.colaborador
    }));
};

/**
 * Cria uma nova etapa
 */
export const createEtapa = async (etapa: Omit<ProjetoEtapa, 'id' | 'createdAt' | 'updatedAt' | 'colaborador'>): Promise<ProjetoEtapa> => {
    ensureAdmin();

    const { data, error } = await supabase
        .from('projeto_etapas')
        .insert({
            projeto_id: etapa.projetoId,
            nome_etapa: etapa.nomeEtapa,
            ordem: etapa.ordem,
            data_inicio_prevista: etapa.dataInicioPrevista,
            data_fim_prevista: etapa.dataFimPrevista,
            status: etapa.status || 'nao_iniciado',
            colaborador_id: etapa.colaboradorId
        })
        .select(`
            *,
            colaborador:colaboradores(nome)
        `)
        .single();

    if (error) {
        throw new Error(`Erro ao criar etapa: ${error.message}`);
    }

    // Sincroniza status do projeto
    await syncProjetoStatus(etapa.projetoId);

    return {
        id: data.id,
        projetoId: data.projeto_id,
        nomeEtapa: data.nome_etapa,
        ordem: data.ordem,
        dataInicioPrevista: data.data_inicio_prevista,
        dataFimPrevista: data.data_fim_prevista,
        status: data.status,
        colaboradorId: data.colaborador_id,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        colaborador: data.colaborador
    };
};

/**
 * Atualiza uma etapa
 */
export const updateEtapa = async (id: string, etapa: Partial<Omit<ProjetoEtapa, 'id' | 'projetoId' | 'createdAt' | 'updatedAt' | 'colaborador'>>): Promise<any> => {
    ensureAdmin();

    // Buscar projeto_id antes de atualizar para o sync
    const { data: current } = await supabase.from('projeto_etapas').select('projeto_id').eq('id', id).single();

    const updateData: any = {};
    if (etapa.nomeEtapa !== undefined) updateData.nome_etapa = etapa.nomeEtapa;
    if (etapa.ordem !== undefined) updateData.ordem = etapa.ordem;
    if (etapa.dataInicioPrevista !== undefined) updateData.data_inicio_prevista = etapa.dataInicioPrevista;
    if (etapa.dataFimPrevista !== undefined) updateData.data_fim_prevista = etapa.dataFimPrevista;
    if (etapa.status !== undefined) updateData.status = etapa.status;
    if (etapa.colaboradorId !== undefined) updateData.colaborador_id = etapa.colaboradorId;

    const { error } = await supabase
        .from('projeto_etapas')
        .update(updateData)
        .eq('id', id);

    if (error) {
        throw new Error(`Erro ao atualizar etapa: ${error.message}`);
    }

    if (current?.projeto_id) {
        return await syncProjetoStatus(current.projeto_id);
    }
};

/**
 * Deleta uma etapa
 */
export const deleteEtapa = async (id: string): Promise<any> => {
    ensureAdmin();

    // Buscar projeto_id antes de deletar para o sync
    const { data: current } = await supabase.from('projeto_etapas').select('projeto_id').eq('id', id).single();

    const { error } = await supabase
        .from('projeto_etapas')
        .delete()
        .eq('id', id);

    if (error) {
        throw new Error(`Erro ao deletar etapa: ${error.message}`);
    }

    if (current?.projeto_id) {
        return await syncProjetoStatus(current.projeto_id);
    }
};
