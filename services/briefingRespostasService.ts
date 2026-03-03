import { supabase } from './supabaseClient';
import { BriefingResposta } from './interfaces/types';

export const briefingRespostasService = {
    async enviarResposta(resposta: Omit<BriefingResposta, 'id' | 'created_at' | 'status'>): Promise<void> {
        // 1. Salvar em briefing_respostas
        const { error: respostaError } = await supabase
            .from('briefing_respostas')
            .insert([resposta]);

        if (respostaError) {
            console.error('Erro ao salvar resposta do briefing:', respostaError);
            throw respostaError;
        }

        // 2. Verificar cliente por email
        const { data: existingClient, error: clientFetchError } = await supabase
            .from('clientes')
            .select('id')
            .eq('email', resposta.email)
            .single();

        if (clientFetchError && clientFetchError.code !== 'PGRST116') { // PGRST116 is code for no rows found
            console.error('Erro ao verificar cliente existente:', clientFetchError);
            // We don't throw here to not block the success message if the briefing was saved
        }

        // 3. Se não existir, criar cliente
        if (!existingClient) {
            const { error: createClientError } = await supabase
                .from('clientes')
                .insert([{
                    nome: resposta.nome,
                    email: resposta.email,
                    telefone: resposta.telefone,
                    origem: 'briefing',
                    ativo: true
                }]);

            if (createClientError) {
                console.error('Erro ao criar cliente automaticamente:', createClientError);
            }
        }
    }
};
