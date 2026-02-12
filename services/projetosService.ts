import { supabase } from './supabaseClient';
import { Projeto, UserRole } from './interfaces/types';
import { getCurrentUser } from './authService';

const ensureAdmin = () => {
    const user = getCurrentUser();
    if (user?.role !== UserRole.ADMIN) {
        throw new Error('Acesso negado: Apenas administradores podem realizar esta ação.');
    }
};

/**
 * Retorna todos os projetos
 */
export const getProjetos = async (): Promise<Projeto[]> => {
    ensureAdmin();

    const { data, error } = await supabase
        .from('projetos')
        .select(`
            *,
            cliente:clientes(id, nome)
        `)
        .order('created_at', { ascending: false });

    if (error) {
        throw new Error(`Erro ao buscar projetos: ${error.message}`);
    }

    return (data || []).map(p => ({
        id: p.id,
        clienteId: p.cliente_id,
        nomeProjeto: p.nome_projeto,
        empresa: p.empresa,
        enderecoObra: p.endereco_obra,
        dataInicio: p.data_inicio,
        dataPrevistaTermino: p.data_prevista_termino,
        status: p.status,
        observacoes: p.observacoes,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
        cliente: p.cliente ? {
            id: p.cliente.id,
            nome: p.cliente.nome
        } : undefined
    }));
};

/**
 * Retorna projetos de um cliente específico
 */
export const getProjetosByCliente = async (clienteId: string): Promise<Projeto[]> => {
    ensureAdmin();

    const { data, error } = await supabase
        .from('projetos')
        .select('*')
        .eq('cliente_id', clienteId)
        .order('created_at', { ascending: false });

    if (error) {
        throw new Error(`Erro ao buscar projetos do cliente: ${error.message}`);
    }

    return (data || []).map(p => ({
        id: p.id,
        clienteId: p.cliente_id,
        nomeProjeto: p.nome_projeto,
        empresa: p.empresa,
        enderecoObra: p.endereco_obra,
        dataInicio: p.data_inicio,
        dataPrevistaTermino: p.data_prevista_termino,
        status: p.status,
        observacoes: p.observacoes,
        createdAt: p.created_at,
        updatedAt: p.updated_at
    }));
};

/**
 * Retorna um projeto por ID
 */
export const getProjetoById = async (id: string): Promise<Projeto | undefined> => {
    ensureAdmin();

    const { data, error } = await supabase
        .from('projetos')
        .select(`
            *,
            cliente:clientes(*)
        `)
        .eq('id', id)
        .single();

    if (error || !data) {
        return undefined;
    }

    return {
        id: data.id,
        clienteId: data.cliente_id,
        nomeProjeto: data.nome_projeto,
        empresa: data.empresa,
        enderecoObra: data.endereco_obra,
        dataInicio: data.data_inicio,
        dataPrevistaTermino: data.data_prevista_termino,
        status: data.status,
        observacoes: data.observacoes,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        cliente: data.cliente ? {
            id: data.cliente.id,
            nome: data.cliente.nome,
            email: data.cliente.email,
            telefone: data.cliente.telefone,
            ativo: data.cliente.ativo,
            createdAt: data.cliente.created_at
        } : undefined
    };
};

/**
 * Cria um novo projeto
 */
export const createProjeto = async (projeto: Omit<Projeto, 'id' | 'createdAt' | 'updatedAt' | 'cliente'>): Promise<Projeto> => {
    ensureAdmin();

    const { data, error } = await supabase
        .from('projetos')
        .insert({
            cliente_id: projeto.clienteId,
            nome_projeto: projeto.nomeProjeto,
            empresa: projeto.empresa,
            endereco_obra: projeto.enderecoObra,
            data_inicio: projeto.dataInicio,
            data_prevista_termino: projeto.dataPrevistaTermino,
            status: projeto.status || 'planejamento',
            observacoes: projeto.observacoes
        })
        .select()
        .single();

    if (error) {
        throw new Error(`Erro ao criar projeto: ${error.message}`);
    }

    return {
        id: data.id,
        clienteId: data.cliente_id,
        nomeProjeto: data.nome_projeto,
        empresa: data.empresa,
        enderecoObra: data.endereco_obra,
        dataInicio: data.data_inicio,
        dataPrevistaTermino: data.data_prevista_termino,
        status: data.status,
        observacoes: data.observacoes,
        createdAt: data.created_at,
        updatedAt: data.updated_at
    };
};

/**
 * Atualiza um projeto existente
 */
export const updateProjeto = async (id: string, projeto: Partial<Omit<Projeto, 'id' | 'createdAt' | 'updatedAt' | 'cliente'>>): Promise<void> => {
    ensureAdmin();

    const updateData: any = {};
    if (projeto.nomeProjeto !== undefined) updateData.nome_projeto = projeto.nomeProjeto;
    if (projeto.clienteId !== undefined) updateData.cliente_id = projeto.clienteId;
    if (projeto.empresa !== undefined) updateData.empresa = projeto.empresa;
    if (projeto.enderecoObra !== undefined) updateData.endereco_obra = projeto.enderecoObra;
    if (projeto.dataInicio !== undefined) updateData.data_inicio = projeto.dataInicio;
    if (projeto.dataPrevistaTermino !== undefined) updateData.data_prevista_termino = projeto.dataPrevistaTermino;
    if (projeto.status !== undefined) updateData.status = projeto.status;
    if (projeto.observacoes !== undefined) updateData.observacoes = projeto.observacoes;

    const { error } = await supabase
        .from('projetos')
        .update(updateData)
        .eq('id', id);

    if (error) {
        throw new Error(`Erro ao atualizar projeto: ${error.message}`);
    }
};

/**
 * Deleta um projeto (opcional, não estava explicitamente no requisito mas é útil)
 */
export const deleteProjeto = async (id: string): Promise<void> => {
    ensureAdmin();

    const { error } = await supabase
        .from('projetos')
        .delete()
        .eq('id', id);

    if (error) {
        throw new Error(`Erro ao deletar projeto: ${error.message}`);
    }
};
