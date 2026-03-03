import { supabase } from './supabaseClient';
import { BriefingResposta } from './interfaces/types';

export const briefingRespostasService = {
    async getRespostas(): Promise<BriefingResposta[]> {
        const { data, error } = await supabase
            .from('briefing_respostas')
            .select('*, projeto_tipos(nome)')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Erro ao buscar respostas do briefing:', error);
            throw error;
        }

        return data || [];
    },

    async enviarResposta(resposta: Partial<BriefingResposta>): Promise<void> {
        // 1. Cadastra ou atualiza o cliente automaticamente a partir do briefing
        try {
            const { data: existingClient } = await supabase
                .from('clientes')
                .select('id')
                .eq('email', resposta.email)
                .maybeSingle();

            if (existingClient) {
                // Se existe, atualizamos apenas nome e telefone caso tenham mudado
                await supabase
                    .from('clientes')
                    .update({
                        nome: resposta.nome,
                        telefone: resposta.telefone,
                    })
                    .eq('id', existingClient.id);
            } else {
                // Se não existe, criamos um novo
                await supabase
                    .from('clientes')
                    .insert([{
                        nome: resposta.nome,
                        email: resposta.email,
                        telefone: resposta.telefone,
                        origem: 'briefing',
                        ativo: true
                    }]);
            }
        } catch (clienteError) {
            console.warn('Nota: Problema ao processar cliente, prosseguindo com o briefing:', clienteError);
        }

        // 2. Salva a resposta do briefing
        const { error } = await supabase
            .from('briefing_respostas')
            .insert([resposta]);

        if (error) {
            console.error('Erro ao enviar resposta do briefing:', error);
            throw error;
        }
    },

    async uploadAnexo(file: File, briefingId: string) {
        const fileExt = file.name.split('.').pop();
        const uuid = crypto.randomUUID();
        const fileName = `${uuid}.${fileExt}`;
        const filePath = `${briefingId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('briefing-anexos')
            .upload(filePath, file);

        if (uploadError) {
            console.error('Erro no upload do anexo:', uploadError);
            throw uploadError;
        }

        const { data } = supabase.storage
            .from('briefing-anexos')
            .getPublicUrl(filePath);

        return {
            pergunta_id: '', // Será preenchido pelo componente
            nome: file.name,
            url: data.publicUrl,
            tipo: file.type,
            tamanho: file.size
        };
    },

    async updateStatus(id: string, status: BriefingResposta['status']): Promise<void> {
        const { error } = await supabase
            .from('briefing_respostas')
            .update({ status })
            .eq('id', id);

        if (error) {
            console.error('Erro ao atualizar status da resposta:', error);
            throw error;
        }
    },

    async deleteResposta(id: string): Promise<void> {
        const { error } = await supabase
            .from('briefing_respostas')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Erro ao deletar resposta do briefing:', error);
            throw error;
        }
    },

    async deleteAnexos(anexos: any[]): Promise<void> {
        if (!anexos || anexos.length === 0) return;

        // Extrair o path relativo do storage a partir da URL pública
        // As URLs geralmente seguem o padrão: .../storage/v1/object/public/briefing-anexos/BRIEFING_ID/FILE_NAME
        const paths = anexos.map(anexo => {
            const urlParts = anexo.url.split('briefing-anexos/');
            return urlParts.length > 1 ? urlParts[1] : null;
        }).filter(Boolean);

        if (paths.length > 0) {
            const { error } = await supabase.storage
                .from('briefing-anexos')
                .remove(paths);

            if (error) {
                console.error('Erro ao deletar anexos do storage:', error);
                // Não lançamos erro aqui para não impedir a exclusão do registro no banco
            }
        }
    }
};
