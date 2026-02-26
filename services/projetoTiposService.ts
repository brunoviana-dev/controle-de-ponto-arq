import { supabase } from './supabaseClient';
import { ProjetoTipo, UserRole } from './interfaces/types';
import { getCurrentUser } from './authService';

/**
 * Verifica se o usuário logado é ADMIN
 */
const isAdmin = () => {
    const user = getCurrentUser();
    return user?.role === UserRole.ADMIN;
};

/**
 * Obtém todos os tipos de projeto
 */
export const getTipos = async (): Promise<ProjetoTipo[]> => {
    const { data, error } = await supabase
        .from('projeto_tipos')
        .select('*')
        .order('nome', { ascending: true });

    if (error) throw new Error(`Erro ao buscar tipos de projeto: ${error.message}`);

    return (data || []).map(t => ({
        id: t.id,
        nome: t.nome,
        ativo: t.ativo,
        contratoTemplatePath: t.contrato_template_path,
        createdAt: t.created_at,
        updatedAt: t.updated_at
    }));
};

/**
 * Obtém apenas tipos ativos
 */
export const getTiposAtivos = async (): Promise<ProjetoTipo[]> => {
    const { data, error } = await supabase
        .from('projeto_tipos')
        .select('*')
        .eq('ativo', true)
        .order('nome', { ascending: true });

    if (error) throw new Error(`Erro ao buscar tipos de projeto: ${error.message}`);

    return (data || []).map(t => ({
        id: t.id,
        nome: t.nome,
        ativo: t.ativo,
        contratoTemplatePath: t.contrato_template_path,
        createdAt: t.created_at,
        updatedAt: t.updated_at
    }));
};

/**
 * Cria um novo tipo de projeto
 */
export const createTipo = async (nome: string, ativo: boolean = true, contratoTemplatePath?: string): Promise<ProjetoTipo> => {
    if (!isAdmin()) throw new Error('Acesso negado. Apenas administradores podem criar tipos de projeto.');
    if (!nome) throw new Error('O nome do tipo de projeto é obrigatório.');

    const { data, error } = await supabase
        .from('projeto_tipos')
        .insert([{
            nome,
            ativo,
            contrato_template_path: contratoTemplatePath
        }])
        .select()
        .single();

    if (error) throw new Error(`Erro ao criar tipo de projeto: ${error.message}`);

    return {
        id: data.id,
        nome: data.nome,
        ativo: data.ativo,
        contratoTemplatePath: data.contrato_template_path,
        createdAt: data.created_at,
        updatedAt: data.updated_at
    };
};

/**
 * Atualiza um tipo de projeto existente
 */
export const updateTipo = async (id: string, updates: Partial<ProjetoTipo>): Promise<ProjetoTipo> => {
    if (!isAdmin()) throw new Error('Acesso negado. Apenas administradores podem editar tipos de projeto.');

    const dataToUpdate: any = {};
    if (updates.nome !== undefined) dataToUpdate.nome = updates.nome;
    if (updates.ativo !== undefined) dataToUpdate.ativo = updates.ativo;
    if (updates.contratoTemplatePath !== undefined) dataToUpdate.contrato_template_path = updates.contratoTemplatePath;

    const { data, error } = await supabase
        .from('projeto_tipos')
        .update(dataToUpdate)
        .eq('id', id)
        .select()
        .single();

    if (error) throw new Error(`Erro ao atualizar tipo de projeto: ${error.message}`);

    return {
        id: data.id,
        nome: data.nome,
        ativo: data.ativo,
        contratoTemplatePath: data.contrato_template_path,
        createdAt: data.created_at,
        updatedAt: data.updated_at
    };
};

/**
 * Upload de template de contrato para o Storage
 */
export const uploadTemplate = async (file: File): Promise<string> => {
    if (!isAdmin()) throw new Error('Acesso negado.');

    const fileExt = file.name.split('.').pop();
    if (fileExt !== 'docx') throw new Error('Apenas arquivos .docx são permitidos.');

    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    const filePath = fileName; // No bucket contratos-templates, salvamos na raiz do bucket com o uuid

    const { error: uploadError } = await supabase.storage
        .from('contratos-templates')
        .upload(filePath, file);

    if (uploadError) throw new Error(`Erro no upload: ${uploadError.message}`);

    return filePath;
};

/**
 * Remove um template do Storage
 */
export const deleteTemplate = async (path: string): Promise<void> => {
    if (!isAdmin()) throw new Error('Acesso negado.');

    const { error } = await supabase.storage
        .from('contratos-templates')
        .remove([path]);

    if (error) throw new Error(`Erro ao deletar arquivo: ${error.message}`);
};

/**
 * Obtém a URL pública de um template para download
 */
export const getTemplateUrl = (path: string): string => {
    const { data } = supabase.storage
        .from('contratos-templates')
        .getPublicUrl(path);

    return data.publicUrl;
};
