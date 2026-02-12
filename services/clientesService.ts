import { supabase } from './supabaseClient';
import { Cliente, UserRole } from './interfaces/types';
import { getCurrentUser } from './authService';

const ensureAdmin = () => {
    const user = getCurrentUser();
    if (user?.role !== UserRole.ADMIN) {
        throw new Error('Acesso negado: Apenas administradores podem realizar esta ação.');
    }
};

/**
 * Retorna todos os clientes
 */
export const getClientes = async (): Promise<Cliente[]> => {
    ensureAdmin();

    const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .order('nome');

    if (error) {
        throw new Error(`Erro ao buscar clientes: ${error.message}`);
    }

    return (data || []).map(c => ({
        id: c.id,
        nome: c.nome,
        email: c.email,
        telefone: c.telefone,
        cpfCnpj: c.cpf_cnpj,
        dataNascimento: c.data_nascimento,
        endereco: c.endereco,
        observacoes: c.observacoes,
        ativo: c.ativo,
        createdAt: c.created_at,
        updatedAt: c.updated_at
    }));
};

/**
 * Retorna um cliente por ID
 */
export const getClienteById = async (id: string): Promise<Cliente | undefined> => {
    ensureAdmin();

    const { data, error } = await supabase
        .from('clientes')
        .select('*')
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
        cpfCnpj: data.cpf_cnpj,
        dataNascimento: data.data_nascimento,
        endereco: data.endereco,
        observacoes: data.observacoes,
        ativo: data.ativo,
        createdAt: data.created_at,
        updatedAt: data.updated_at
    };
};

/**
 * Cria um novo cliente
 */
export const createCliente = async (cliente: Omit<Cliente, 'id' | 'createdAt' | 'updatedAt'>): Promise<Cliente> => {
    ensureAdmin();

    const { data, error } = await supabase
        .from('clientes')
        .insert({
            nome: cliente.nome,
            email: cliente.email,
            telefone: cliente.telefone,
            cpf_cnpj: cliente.cpfCnpj,
            data_nascimento: cliente.dataNascimento,
            endereco: cliente.endereco,
            observacoes: cliente.observacoes,
            ativo: cliente.ativo !== undefined ? cliente.ativo : true
        })
        .select()
        .single();

    if (error) {
        throw new Error(`Erro ao criar cliente: ${error.message}`);
    }

    return {
        id: data.id,
        nome: data.nome,
        email: data.email,
        telefone: data.telefone,
        cpfCnpj: data.cpf_cnpj,
        dataNascimento: data.data_nascimento,
        endereco: data.endereco,
        observacoes: data.observacoes,
        ativo: data.ativo,
        createdAt: data.created_at,
        updatedAt: data.updated_at
    };
};

/**
 * Atualiza um cliente existente
 */
export const updateCliente = async (id: string, cliente: Partial<Omit<Cliente, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> => {
    ensureAdmin();

    const updateData: any = {};
    if (cliente.nome !== undefined) updateData.nome = cliente.nome;
    if (cliente.email !== undefined) updateData.email = cliente.email;
    if (cliente.telefone !== undefined) updateData.telefone = cliente.telefone;
    if (cliente.cpfCnpj !== undefined) updateData.cpf_cnpj = cliente.cpfCnpj;
    if (cliente.dataNascimento !== undefined) updateData.data_nascimento = cliente.dataNascimento;
    if (cliente.endereco !== undefined) updateData.endereco = cliente.endereco;
    if (cliente.observacoes !== undefined) updateData.observacoes = cliente.observacoes;
    if (cliente.ativo !== undefined) updateData.ativo = cliente.ativo;

    const { error } = await supabase
        .from('clientes')
        .update(updateData)
        .eq('id', id);

    if (error) {
        throw new Error(`Erro ao atualizar cliente: ${error.message}`);
    }
};

/**
 * Desativa (soft delete) ou Ativa um cliente
 */
export const toggleClienteAtivo = async (id: string, ativo: boolean): Promise<void> => {
    ensureAdmin();

    const { error } = await supabase
        .from('clientes')
        .update({ ativo })
        .eq('id', id);

    if (error) {
        throw new Error(`Erro ao alterar status do cliente: ${error.message}`);
    }
};
