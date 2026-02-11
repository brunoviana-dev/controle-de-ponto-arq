import { supabase } from './supabaseClient';
import { Colaborador } from './interfaces/types';

/**
 * Retorna todos os colaboradores
 */
export const getColaboradores = async (): Promise<Colaborador[]> => {
    const { data, error } = await supabase
        .from('colaboradores')
        .select('id, nome, email, telefone, valor_hora, login, created_at')
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
        login: c.login,
        createdAt: c.created_at
    }));
};

/**
 * Retorna um colaborador por ID
 */
export const getColaboradorById = async (id: string): Promise<Colaborador | undefined> => {
    const { data, error } = await supabase
        .from('colaboradores')
        .select('id, nome, email, telefone, valor_hora, login, created_at')
        .eq('id', id)
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
        login: data.login,
        createdAt: data.created_at
    };
};

/**
 * Salva um colaborador (cria novo ou atualiza existente)
 */
export const saveColaborador = async (colab: Partial<Colaborador>): Promise<void> => {
    if (colab.id) {
        // Atualizar existente
        const updateData: any = {
            nome: colab.nome,
            email: colab.email,
            telefone: colab.telefone,
            valor_hora: colab.valorHora,
            login: colab.login
        };

        // Só atualizar senha se foi fornecida
        if (colab.senha) {
            updateData.senha_hash = colab.senha; // Em produção, usar bcrypt
        }

        const { error } = await supabase
            .from('colaboradores')
            .update(updateData)
            .eq('id', colab.id);

        if (error) {
            throw new Error(`Erro ao atualizar colaborador: ${error.message}`);
        }
    } else {
        // Criar novo
        const { error } = await supabase
            .from('colaboradores')
            .insert({
                nome: colab.nome,
                email: colab.email,
                telefone: colab.telefone,
                valor_hora: colab.valorHora,
                login: colab.login,
                senha_hash: colab.senha || 'senha123' // Em produção, usar bcrypt
            });

        if (error) {
            throw new Error(`Erro ao criar colaborador: ${error.message}`);
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
        .eq('id', id);

    if (error) {
        throw new Error(`Erro ao deletar colaborador: ${error.message}`);
    }
};
