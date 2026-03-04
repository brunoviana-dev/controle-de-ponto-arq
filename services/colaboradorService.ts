import { supabase } from './supabaseClient';
import { Colaborador } from './interfaces/types';
import { getEmpresaAtualId } from '../utils/config';

/**
 * Retorna todos os colaboradores
 */
export const getColaboradores = async (): Promise<Colaborador[]> => {
    const { data, error } = await supabase
        .from('colaboradores')
        .select('id, nome, email, telefone, valor_hora, valor_inss_fixo, login, perfil, created_at')
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
        login: c.login,
        perfil: c.perfil,
        createdAt: c.created_at
    }));
};

/**
 * Retorna um colaborador por ID
 */
export const getColaboradorById = async (id: string): Promise<Colaborador | undefined> => {
    const { data, error } = await supabase
        .from('colaboradores')
        .select('id, nome, email, telefone, valor_hora, valor_inss_fixo, login, perfil, created_at')
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
        login: data.login,
        perfil: data.perfil,
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
            valor_inss_fixo: colab.valorInssFixo || 0,
            login: colab.login,
            perfil: colab.perfil || 'usuario'
        };

        // Só atualizar senha se foi fornecida
        if (colab.senha) {
            updateData.senha_hash = colab.senha; // Em produção, usar bcrypt
        }

        const { error } = await supabase
            .from('colaboradores')
            .update(updateData)
            .eq('id', colab.id)
            .eq('empresa_id', getEmpresaAtualId());

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
                valor_inss_fixo: colab.valorInssFixo || 0,
                login: colab.login,
                perfil: colab.perfil || 'usuario',
                senha_hash: colab.senha || 'senha123', // Em produção, usar bcrypt
                empresa_id: getEmpresaAtualId()
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
        .eq('id', id)
        .eq('empresa_id', getEmpresaAtualId());

    if (error) {
        throw new Error(`Erro ao deletar colaborador: ${error.message}`);
    }
};
