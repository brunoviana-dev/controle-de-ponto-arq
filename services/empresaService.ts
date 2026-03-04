import { supabase } from './supabaseClient';
import { Empresa, UserRole } from './interfaces/types';
import { getCurrentUser } from './authService';
import { getEmpresaAtualId } from '../utils/config';

const ensureAdmin = () => {
    const user = getCurrentUser();
    if (user?.role !== UserRole.ADMIN) {
        throw new Error('Acesso negado: Apenas administradores podem realizar esta ação.');
    }
};

/**
 * Retorna os dados da empresa atual
 */
export const getEmpresa = async (): Promise<Empresa | null> => {
    const { data, error } = await supabase
        .from('empresas')
        .select('*')
        .eq('id', getEmpresaAtualId())
        .maybeSingle();

    if (error) {
        throw new Error(`Erro ao buscar dados da empresa: ${error.message}`);
    }

    return data;
};

/**
 * Busca empresa pelo slug (para rota pública)
 */
export const getEmpresaBySlug = async (slug: string): Promise<Empresa | null> => {
    const { data, error } = await supabase
        .from('empresas')
        .select('*')
        .eq('slug', slug)
        .eq('ativo', true)
        .maybeSingle();

    if (error) {
        throw new Error(`Erro ao buscar empresa: ${error.message}`);
    }

    return data;
};

/**
 * Cria ou atualiza os dados da empresa
 */
export const upsertEmpresa = async (empresa: Omit<Empresa, 'id' | 'created_at' | 'updated_at'>): Promise<Empresa> => {
    ensureAdmin();

    const empresaId = getEmpresaAtualId();

    const { data, error } = await supabase
        .from('empresas')
        .update(empresa)
        .eq('id', empresaId)
        .select()
        .single();

    if (error) throw new Error(`Erro ao atualizar empresa: ${error.message}`);
    return data;
};

/**
 * Faz upload de imagem para o storage da empresa
 */
export const uploadAsset = async (file: File, type: 'logo' | 'header'): Promise<string> => {
    ensureAdmin();

    const fileExt = file.name.split('.').pop();
    const fileName = `${type}_${Date.now()}.${fileExt}`;
    const filePath = `identidade/${fileName}`;

    const { error: uploadError } = await supabase.storage
        .from('empresa-assets')
        .upload(filePath, file);

    if (uploadError) {
        throw new Error(`Erro no upload: ${uploadError.message}`);
    }

    const { data } = supabase.storage
        .from('empresa-assets')
        .getPublicUrl(filePath);

    return data.publicUrl;
};
