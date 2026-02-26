import { supabase } from './supabaseClient';
import { ProjetoTipoEtapa, UserRole } from './interfaces/types';
import { getCurrentUser } from './authService';

/**
 * Verifica se o usuário logado é ADMIN
 */
const isAdmin = () => {
    const user = getCurrentUser();
    return user?.role === UserRole.ADMIN;
};

/**
 * Obtém as etapas padrão de um tipo de projeto
 */
export const getEtapasByTipo = async (projetoTipoId: string): Promise<ProjetoTipoEtapa[]> => {
    const { data, error } = await supabase
        .from('projeto_tipo_etapas')
        .select('*')
        .eq('projeto_tipo_id', projetoTipoId)
        .order('ordem', { ascending: true });

    if (error) throw new Error(`Erro ao buscar etapas padrão: ${error.message}`);

    return (data || []).map(e => ({
        id: e.id,
        projetoTipoId: e.projeto_tipo_id,
        nomeEtapa: e.nome_etapa,
        ordem: e.ordem,
        createdAt: e.created_at,
        updatedAt: e.updated_at
    }));
};

/**
 * Cria uma nova etapa padrão
 */
export const createEtapaPadrao = async (etapa: Omit<ProjetoTipoEtapa, 'id' | 'createdAt' | 'updatedAt'>): Promise<ProjetoTipoEtapa> => {
    if (!isAdmin()) throw new Error('Acesso negado.');

    const { data, error } = await supabase
        .from('projeto_tipo_etapas')
        .insert([{
            projeto_tipo_id: etapa.projetoTipoId,
            nome_etapa: etapa.nomeEtapa,
            ordem: etapa.ordem
        }])
        .select()
        .single();

    if (error) throw new Error(`Erro ao criar etapa padrão: ${error.message}`);

    return {
        id: data.id,
        projetoTipoId: data.projeto_tipo_id,
        nomeEtapa: data.nome_etapa,
        ordem: data.ordem,
        createdAt: data.created_at,
        updatedAt: data.updated_at
    };
};

/**
 * Atualiza uma etapa padrão
 */
export const updateEtapaPadrao = async (id: string, updates: Partial<ProjetoTipoEtapa>): Promise<void> => {
    if (!isAdmin()) throw new Error('Acesso negado.');

    const dataToUpdate: any = {};
    if (updates.nomeEtapa !== undefined) dataToUpdate.nome_etapa = updates.nomeEtapa;
    if (updates.ordem !== undefined) dataToUpdate.ordem = updates.ordem;

    const { error } = await supabase
        .from('projeto_tipo_etapas')
        .update(dataToUpdate)
        .eq('id', id);

    if (error) throw new Error(`Erro ao atualizar etapa padrão: ${error.message}`);
};

/**
 * Exclui uma etapa padrão
 */
export const deleteEtapaPadrao = async (id: string): Promise<void> => {
    if (!isAdmin()) throw new Error('Acesso negado.');

    const { error } = await supabase
        .from('projeto_tipo_etapas')
        .delete()
        .eq('id', id);

    if (error) throw new Error(`Erro ao excluir etapa padrão: ${error.message}`);
};

/**
 * Sincroniza (salva) todas as etapas de um tipo de projeto de uma vez
 * Útil para o formulário de edição
 */
export const saveEtapasByTipo = async (projetoTipoId: string, etapas: Partial<ProjetoTipoEtapa>[]): Promise<void> => {
    if (!isAdmin()) throw new Error('Acesso negado.');

    // 1. Buscar etapas atuais
    const { data: atuais } = await supabase
        .from('projeto_tipo_etapas')
        .select('id')
        .eq('projeto_tipo_id', projetoTipoId);

    const idsAtuais = atuais?.map(a => a.id) || [];
    const idsEnviados = etapas.map(e => e.id).filter(id => !!id) as string[];

    // 2. Deletar as que foram removidas
    const idsParaDeletar = idsAtuais.filter(id => !idsEnviados.includes(id));
    if (idsParaDeletar.length > 0) {
        await supabase.from('projeto_tipo_etapas').delete().in('id', idsParaDeletar);
    }

    // 3. Atualizar ou Criar
    for (const etapa of etapas) {
        if (etapa.id) {
            await updateEtapaPadrao(etapa.id, etapa);
        } else {
            await createEtapaPadrao({
                projetoTipoId,
                nomeEtapa: etapa.nomeEtapa!,
                ordem: etapa.ordem
            });
        }
    }
};
