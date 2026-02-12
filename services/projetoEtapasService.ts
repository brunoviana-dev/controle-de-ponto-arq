import { supabase } from './supabaseClient';
import { ProjetoEtapa, UserRole } from './interfaces/types';
import { getCurrentUser } from './authService';

const ensureAdmin = () => {
    const user = getCurrentUser();
    if (user?.role !== UserRole.ADMIN) {
        throw new Error('Acesso negado: Apenas administradores podem realizar esta ação.');
    }
};

/**
 * Retorna todas as etapas de um projeto com join opcional para colaborador
 */
export const getEtapasByProjeto = async (projetoId: string): Promise<ProjetoEtapa[]> => {
    ensureAdmin();

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
 * Sincroniza o status do projeto com base no status de suas etapas
 */
const syncProjetoStatus = async (projetoId: string): Promise<string> => {
    // Busca todas as etapas atuais do projeto
    const { data: etapas, error: errorEtapas } = await supabase
        .from('projeto_etapas')
        .select('status')
        .eq('projeto_id', projetoId);

    if (errorEtapas) throw errorEtapas;

    if (!etapas || etapas.length === 0) return 'planejamento';

    const total = etapas.length;
    const countNaoIniciado = etapas.filter(e => e.status === 'nao_iniciado').length;
    const countConcluido = etapas.filter(e => e.status === 'concluido').length;
    const countCancelado = etapas.filter(e => e.status === 'cancelado').length;
    const countEmAndamento = etapas.filter(e => e.status === 'em_andamento').length;

    let novoStatus = 'em_andamento';

    if (countNaoIniciado === total) {
        novoStatus = 'planejamento';
    } else if (countCancelado === total) {
        novoStatus = 'cancelado';
    } else if (countConcluido + countCancelado === total) {
        novoStatus = 'concluido';
    } else if (countEmAndamento > 0 || (countConcluido > 0 && countNaoIniciado > 0)) {
        novoStatus = 'em_andamento';
    }

    const { error: errorUpdate } = await supabase
        .from('projetos')
        .update({ status: novoStatus })
        .eq('id', projetoId);

    if (errorUpdate) throw errorUpdate;

    return novoStatus;
};

/**
 * Cria uma nova etapa para um projeto
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
 * Atualiza uma etapa existente e retorna o novo status do projeto
 */
export const updateEtapa = async (id: string, etapa: Partial<Omit<ProjetoEtapa, 'id' | 'projetoId' | 'createdAt' | 'updatedAt' | 'colaborador'>>): Promise<string> => {
    ensureAdmin();

    // Primeiro precisamos do projetoId se não foi passado (e não é passado no update)
    const { data: etapaAtual, error: errorFetch } = await supabase
        .from('projeto_etapas')
        .select('projeto_id')
        .eq('id', id)
        .single();

    if (errorFetch) throw errorFetch;

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

    // Sincroniza status do projeto e retorna o novo status
    return await syncProjetoStatus(etapaAtual.projeto_id);
};

/**
 * Exclui uma etapa
 */
export const deleteEtapa = async (id: string): Promise<string> => {
    ensureAdmin();

    // Busca o projeto_id antes de deletar
    const { data: etapaAtual, error: errorFetch } = await supabase
        .from('projeto_etapas')
        .select('projeto_id')
        .eq('id', id)
        .single();

    if (errorFetch) throw errorFetch;

    const { error } = await supabase
        .from('projeto_etapas')
        .delete()
        .eq('id', id);

    if (error) {
        throw new Error(`Erro ao excluir etapa: ${error.message}`);
    }

    // Sincroniza status do projeto
    return await syncProjetoStatus(etapaAtual.projeto_id);
};
