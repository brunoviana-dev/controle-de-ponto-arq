import { supabase } from './supabaseClient';
import { BriefingPergunta, BriefingOpcao } from './interfaces/types';
import { getEmpresaAtualId } from '../utils/config';

// Helper para converter string simples em slug
const slugify = (text: string) => {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
};

// Helper para garantir que as opções estejam no novo formato
export const normalizarOpcoes = (opcoes: any[] | undefined | null): BriefingOpcao[] => {
    if (!opcoes) return [];

    return opcoes.map(opt => {
        if (typeof opt === 'string') {
            return {
                label: opt,
                value: slugify(opt),
                image_url: null
            };
        }
        return {
            label: opt.label || '',
            value: opt.value || slugify(opt.label || ''),
            image_url: opt.image_url || null
        };
    });
};

export const briefingPerguntasService = {
    async getPerguntas(empresaIdOverride?: string): Promise<BriefingPergunta[]> {
        const empresaId = empresaIdOverride || getEmpresaAtualId();
        const { data, error } = await supabase
            .from('briefing_perguntas')
            .select('*')
            .eq('empresa_id', empresaId)
            .order('ordem', { ascending: true });

        if (error) {
            console.error('Erro ao buscar perguntas do briefing:', error);
            throw error;
        }

        // Normalização automática para compatibilidade
        return (data || []).map(p => ({
            ...p,
            opcoes: normalizarOpcoes(p.opcoes)
        }));
    },

    async createPergunta(pergunta: Omit<BriefingPergunta, 'id' | 'created_at'>): Promise<BriefingPergunta> {
        const { data, error } = await supabase
            .from('briefing_perguntas')
            .insert([{ ...pergunta, empresa_id: getEmpresaAtualId() }])
            .select()
            .single();

        if (error) {
            console.error('Erro ao criar pergunta do briefing:', error);
            throw error;
        }

        return {
            ...data,
            opcoes: normalizarOpcoes(data.opcoes)
        };
    },

    async updatePergunta(id: string, pergunta: Partial<Omit<BriefingPergunta, 'id' | 'created_at'>>): Promise<BriefingPergunta> {
        const { data, error } = await supabase
            .from('briefing_perguntas')
            .update(pergunta)
            .eq('id', id)
            .eq('empresa_id', getEmpresaAtualId())
            .select()
            .single();

        if (error) {
            console.error('Erro ao atualizar pergunta do briefing:', error);
            throw error;
        }

        return {
            ...data,
            opcoes: normalizarOpcoes(data.opcoes)
        };
    },

    async deletePergunta(id: string): Promise<void> {
        const { error } = await supabase
            .from('briefing_perguntas')
            .delete()
            .eq('id', id)
            .eq('empresa_id', getEmpresaAtualId());

        if (error) {
            console.error('Erro ao deletar pergunta do briefing:', error);
            throw error;
        }
    },

    async uploadOpcaoImagem(file: File): Promise<string> {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
        const filePath = `opcoes/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('briefing-opcoes')
            .upload(filePath, file);

        if (uploadError) {
            throw uploadError;
        }

        const { data } = supabase.storage
            .from('briefing-opcoes')
            .getPublicUrl(filePath);

        return data.publicUrl;
    }
};
