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

        // Busca as perguntas
        const { data: perguntas, error: pError } = await supabase
            .from('briefing_perguntas')
            .select('*')
            .eq('empresa_id', empresaId)
            .order('ordem', { ascending: true });

        if (pError) {
            console.error('Erro ao buscar perguntas do briefing:', pError);
            throw pError;
        }

        // Busca as associações com tipos de projeto
        const { data: associacoes, error: aError } = await supabase
            .from('briefing_perguntas_tipos_projeto')
            .select('pergunta_id, tipo_projeto_id');

        if (aError) {
            console.error('Erro ao buscar associações de tipos de projeto:', aError);
        }

        // Mapeia os IDs para as perguntas
        return (perguntas || []).map(p => ({
            ...p,
            opcoes: normalizarOpcoes(p.opcoes),
            tipo_projeto_ids: associacoes
                ?.filter(a => a.pergunta_id === p.id)
                .map(a => a.tipo_projeto_id) || []
        }));
    },

    async createPergunta(pergunta: Omit<BriefingPergunta, 'id' | 'created_at'>): Promise<BriefingPergunta> {
        const { tipo_projeto_ids, ...dadosPergunta } = pergunta;

        const { data, error } = await supabase
            .from('briefing_perguntas')
            .insert([{ ...dadosPergunta, empresa_id: getEmpresaAtualId() }])
            .select()
            .single();

        if (error) {
            console.error('Erro ao criar pergunta do briefing:', error);
            throw error;
        }

        // Salva as associações se houver
        if (tipo_projeto_ids && tipo_projeto_ids.length > 0) {
            const inserts = tipo_projeto_ids.map(tipoId => ({
                pergunta_id: data.id,
                tipo_projeto_id: tipoId
            }));
            await supabase.from('briefing_perguntas_tipos_projeto').insert(inserts);
        }

        return {
            ...data,
            opcoes: normalizarOpcoes(data.opcoes),
            tipo_projeto_ids: tipo_projeto_ids || []
        };
    },

    async updatePergunta(id: string, pergunta: Partial<Omit<BriefingPergunta, 'id' | 'created_at'>>): Promise<BriefingPergunta> {
        const { tipo_projeto_ids, ...dadosPergunta } = pergunta;

        const { data, error } = await supabase
            .from('briefing_perguntas')
            .update(dadosPergunta)
            .eq('id', id)
            .eq('empresa_id', getEmpresaAtualId())
            .select()
            .single();

        if (error) {
            console.error('Erro ao atualizar pergunta do briefing:', error);
            throw error;
        }

        // Atualiza as associações (Remove antigas e insere novas)
        if (tipo_projeto_ids !== undefined) {
            await supabase
                .from('briefing_perguntas_tipos_projeto')
                .delete()
                .eq('pergunta_id', id);

            if (tipo_projeto_ids.length > 0) {
                const inserts = tipo_projeto_ids.map(tipoId => ({
                    pergunta_id: id,
                    tipo_projeto_id: tipoId
                }));
                await supabase.from('briefing_perguntas_tipos_projeto').insert(inserts);
            }
        }

        return {
            ...data,
            opcoes: normalizarOpcoes(data.opcoes),
            tipo_projeto_ids: tipo_projeto_ids || []
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
        const empresaId = getEmpresaAtualId();
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
        const filePath = `${empresaId}/opcoes/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('briefing-imagens')
            .upload(filePath, file);

        if (uploadError) {
            console.error('Erro no upload da imagem:', uploadError);
            throw uploadError;
        }

        const { data } = supabase.storage
            .from('briefing-imagens')
            .getPublicUrl(filePath);

        return data.publicUrl;
    }
};
