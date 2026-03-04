import { supabase } from './supabaseClient';
import { Cliente, UserRole } from './interfaces/types';
import { getCurrentUser } from './authService';
import { getEmpresaAtualId } from '../utils/config';

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
        .eq('empresa_id', getEmpresaAtualId())
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
        origem: c.origem,
        authUserId: c.auth_user_id,
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
        cpfCnpj: data.cpf_cnpj,
        dataNascimento: data.data_nascimento,
        endereco: data.endereco,
        observacoes: data.observacoes,
        ativo: data.ativo,
        origem: data.origem,
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
            ativo: cliente.ativo !== undefined ? cliente.ativo : true,
            origem: cliente.origem || 'direto',
            empresa_id: getEmpresaAtualId()
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
        origem: data.origem,
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
        .eq('id', id)
        .eq('empresa_id', getEmpresaAtualId());

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
        .eq('id', id)
        .eq('empresa_id', getEmpresaAtualId());

    if (error) {
        throw new Error(`Erro ao alterar status do cliente: ${error.message}`);
    }
};

/**
 * Cria um login (Supabase Auth) para um cliente e vincula ao registro.
 * Usa uma Edge Function com service_role para não afetar a sessão do admin atual.
 */
export const vincularAuthAoCliente = async (clienteId: string, email: string, password: string): Promise<string> => {
    ensureAdmin();

    // Chama a Edge Function server-side que usa admin.createUser()
    // Isso evita que o signUp() do frontend crie uma sessão do cliente,
    // o que causaria redirect indesejado ao sobrescrever a sessão do admin.
    const { data, error } = await supabase.functions.invoke('create-client-auth', {
        body: { email, password, clienteId }
    });

    if (error) throw new Error(error.message || 'Erro ao criar login do cliente');
    if (data?.error) throw new Error(data.error);
    if (!data?.authUserId) throw new Error('Erro ao criar usuário de autenticação');

    return data.authUserId;
};
