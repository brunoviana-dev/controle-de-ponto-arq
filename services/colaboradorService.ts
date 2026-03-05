import { supabase } from './supabaseClient';
import { Colaborador } from './interfaces/types';
import { getEmpresaAtualId } from '../utils/config';

/**
 * Retorna todos os colaboradores
 */
export const getColaboradores = async (): Promise<Colaborador[]> => {
    const { data, error } = await supabase
        .from('colaboradores')
        .select('id, nome, email, telefone, valor_hora, valor_inss_fixo, perfil, user_id, created_at')
        .eq('empresa_id', getEmpresaAtualId())
        .order('nome');

    if (error) {
        throw new Error(`Erro ao buscar colaboradores: ${error.message}`);
    }

    // Mapear snake_case para camelCase
    return (data || []).map(c => ({
        id: c.id,
        nome: c.nome,
        email: c.email,
        telefone: c.telefone,
        valorHora: c.valor_hora,
        valorInssFixo: c.valor_inss_fixo,
        perfil: c.perfil,
        userId: c.user_id,
        createdAt: c.created_at
    }));
};

/**
 * Retorna um colaborador por ID
 */
export const getColaboradorById = async (id: string): Promise<Colaborador | undefined> => {
    const { data, error } = await supabase
        .from('colaboradores')
        .select('id, nome, email, telefone, valor_hora, valor_inss_fixo, perfil, user_id, created_at')
        .eq('id', id)
        .eq('empresa_id', getEmpresaAtualId())
        .single();

    if (error || !data) {
        return undefined;
    }

    return {
        id: data.id,
        nome: data.nome,
        email: data.email,
        telefone: data.telefone,
        valorHora: data.valor_hora,
        valorInssFixo: data.valor_inss_fixo,
        perfil: data.perfil,
        userId: data.user_id,
        createdAt: data.created_at
    };
};

/**
 * Salva um colaborador (cria novo ou atualiza existente)
 */
export const saveColaborador = async (colab: Partial<Colaborador>): Promise<void> => {
    let collaboratorId = colab.id;

    if (collaboratorId) {
        // 1. Atualizar dados básicos na tabela colaboradores
        const updateData: any = {
            nome: colab.nome,
            email: colab.email,
            telefone: colab.telefone,
            valor_hora: colab.valorHora,
            valor_inss_fixo: colab.valorInssFixo || 0,
            perfil: colab.perfil || 'usuario'
        };

        const { error: updateError } = await supabase
            .from('colaboradores')
            .update(updateData)
            .eq('id', collaboratorId)
            .eq('empresa_id', getEmpresaAtualId());

        if (updateError) {
            throw new Error(`Erro ao atualizar colaborador: ${updateError.message}`);
        }
    } else {
        // 1. Criar novo registro na tabela colaboradores
        const { data, error: insertError } = await supabase
            .from('colaboradores')
            .insert({
                nome: colab.nome,
                email: colab.email,
                telefone: colab.telefone,
                valor_hora: colab.valorHora,
                valor_inss_fixo: colab.valorInssFixo || 0,
                perfil: colab.perfil || 'usuario',
                empresa_id: getEmpresaAtualId()
            })
            .select()
            .single();

        if (insertError) {
            throw new Error(`Erro ao criar colaborador: ${insertError.message}`);
        }
        collaboratorId = data.id;
    }

    // 2. Gerenciar Autenticação no Supabase Auth
    if (colab.email && (colab.senha || !colab.id)) {
        try {
            const { data, error: authError } = await supabase.functions.invoke('manage-user-auth', {
                body: {
                    email: colab.email,
                    password: colab.senha || 'senha123',
                    targetId: collaboratorId,
                    table: 'colaboradores'
                }
            });

            if (authError || (data && data.error)) {
                const errorMessage = authError?.message || data?.error || 'Erro desconhecido na autenticação';
                console.error('Erro ao sincronizar com Supabase Auth:', errorMessage);
                // Opcional: Você pode escolher lançar o erro aqui se quiser que a criação falhe 
                // se a autenticação falhar. Por enquanto, apenas avisamos no console.
                // throw new Error(`Colaborador salvo, mas erro no acesso: ${errorMessage}`);
            }
        } catch (err) {
            console.error('Falha crítica ao chamar função de autenticação:', err);
        }
    }
};

/**
 * Deleta um colaborador
 */
export const deleteColaborador = async (id: string): Promise<void> => {
    const { error } = await supabase
        .from('colaboradores')
        .delete()
        .eq('id', id)
        .eq('empresa_id', getEmpresaAtualId());

    if (error) {
        throw new Error(`Erro ao deletar colaborador: ${error.message}`);
    }
};
