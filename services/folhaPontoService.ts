import { supabase } from './supabaseClient';
import { FolhaPonto, PontoDia } from './interfaces/types';

/**
 * Cria uma folha de ponto vazia para um mês
 */
const createEmptyMonth = (colaboradorId: string, mes: number, ano: number): FolhaPonto => {
    const daysCount = new Date(ano, mes, 0).getDate();
    const dias: PontoDia[] = [];

    for (let i = 1; i <= daysCount; i++) {
        // Criar data no formato ISO para armazenamento
        const dataIso = new Date(ano, mes - 1, i).toISOString().split('T')[0];
        dias.push({
            dia: i,
            dataIso,
            entrada1: '',
            saida1: '',
            entrada2: '',
            saida2: '',
            extraEntrada1: '',
            extraSaida1: '',
            extraEntrada2: '',
            extraSaida2: '',
            observacoes: ''
        });
    }

    return {
        id: `${colaboradorId}_${ano}_${mes}`,
        colaboradorId,
        mes,
        ano,
        dias,
        updatedAt: new Date().toISOString()
    };
};

/**
 * Busca ou cria uma folha de ponto
 */
export const getFolhaPonto = async (
    colaboradorId: string,
    mes: number,
    ano: number
): Promise<FolhaPonto> => {
    const { data, error } = await supabase
        .from('folhas_ponto')
        .select('*')
        .eq('colaborador_id', colaboradorId)
        .eq('mes', mes)
        .eq('ano', ano)
        .single();

    // Se encontrou, retornar
    if (data && !error) {
        return {
            id: data.id,
            colaboradorId: data.colaborador_id,
            mes: data.mes,
            ano: data.ano,
            dias: data.dias as PontoDia[],
            updatedAt: data.updated_at
        };
    }

    // Se não encontrou, retornar folha vazia (sem salvar ainda)
    return createEmptyMonth(colaboradorId, mes, ano);
};

/**
 * Salva uma folha de ponto (insert ou update)
 */
export const saveFolhaPonto = async (folha: FolhaPonto): Promise<void> => {
    const folhaData = {
        colaborador_id: folha.colaboradorId,
        mes: folha.mes,
        ano: folha.ano,
        dias: folha.dias,
        updated_at: new Date().toISOString()
    };

    // Tentar fazer upsert baseado no constraint unique
    const { error } = await supabase
        .from('folhas_ponto')
        .upsert(folhaData, {
            onConflict: 'colaborador_id,mes,ano'
        });

    if (error) {
        throw new Error(`Erro ao salvar folha de ponto: ${error.message}`);
    }
};
