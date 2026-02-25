import { supabase } from './supabaseClient';
import { ProjetoTipo } from './interfaces/types';

/**
 * Obtém todos os tipos de projeto ativos
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
        ativo: t.ativo
    }));
};
