import { supabase } from './supabaseClient';
import { BriefingPergunta } from './interfaces/types';

export const briefingPerguntasService = {
    async getPerguntas(): Promise<BriefingPergunta[]> {
        const { data, error } = await supabase
            .from('briefing_perguntas')
            .select('*')
            .order('ordem', { ascending: true });

        if (error) {
            console.error('Erro ao buscar perguntas do briefing:', error);
            throw error;
        }

        return data || [];
    },

    async createPergunta(pergunta: Omit<BriefingPergunta, 'id' | 'created_at'>): Promise<BriefingPergunta> {
        const { data, error } = await supabase
            .from('briefing_perguntas')
            .insert([pergunta])
            .select()
            .single();

        if (error) {
            console.error('Erro ao criar pergunta do briefing:', error);
            throw error;
        }

        return data;
    },

    async updatePergunta(id: string, pergunta: Partial<Omit<BriefingPergunta, 'id' | 'created_at'>>): Promise<BriefingPergunta> {
        const { data, error } = await supabase
            .from('briefing_perguntas')
            .update(pergunta)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Erro ao atualizar pergunta do briefing:', error);
            throw error;
        }

        return data;
    },

    async deletePergunta(id: string): Promise<void> {
        const { error } = await supabase
            .from('briefing_perguntas')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Erro ao deletar pergunta do briefing:', error);
            throw error;
        }
    }
};
