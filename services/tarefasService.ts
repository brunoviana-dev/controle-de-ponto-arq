import { supabase } from './supabaseClient';

export interface Tarefa {
    id: string;
    empresa_id: string;
    titulo: string;
    descricao?: string;
    data_inicio?: string;
    data_fim?: string;
    hora_inicio?: string;
    hora_fim?: string;
    dia_inteiro: boolean;
    projeto_id?: string;
    etapa_id?: string;
    status: 'pendente' | 'concluída';
    created_at?: string;
    updated_at?: string;
}

export interface TarefaColaborador {
    id: string;
    empresa_id: string;
    tarefa_id: string;
    colaborador_id: string;
    created_at: string;
}

export interface TarefaComRelacionamentos extends Tarefa {
    projetos?: { id: string; titulo: string };
    projeto_etapas?: { id: string; nome: string };
    colaboradores_ids?: string[];
}

export const tarefasService = {
    async getTarefas(empresaId: string, filtros?: { colaboradorId?: string }) {
        let query = supabase
            .from('tarefas')
            .select(`
        *,
        projetos (id, nome_projeto),
        projeto_etapas (id, nome_etapa),
        tarefas_colaboradores (colaborador_id)
      `)
            .eq('empresa_id', empresaId);

        const { data, error } = await query;

        if (error) {
            console.error('Erro ao buscar tarefas:', error);
            throw error;
        }

        let tarefasFormatadas = (data || []).map((t: any) => ({
            ...t,
            colaboradores_ids: t.tarefas_colaboradores?.map((tc: any) => tc.colaborador_id) || []
        }));

        if (filtros?.colaboradorId) {
            tarefasFormatadas = tarefasFormatadas.filter(t =>
                t.colaboradores_ids.includes(filtros.colaboradorId)
            );
        }

        return tarefasFormatadas as TarefaComRelacionamentos[];
    },

    async getTarefaById(id: string, empresaId: string) {
        const { data, error } = await supabase
            .from('tarefas')
            .select(`
        *,
        projetos (id, nome_projeto),
        projeto_etapas (id, nome_etapa),
        tarefas_colaboradores (colaborador_id)
      `)
            .eq('id', id)
            .eq('empresa_id', empresaId)
            .single();

        if (error) {
            console.error('Erro ao buscar tarefa:', error);
            throw error;
        }

        if (data) {
            return {
                ...data,
                colaboradores_ids: data.tarefas_colaboradores?.map((tc: any) => tc.colaborador_id) || []
            } as TarefaComRelacionamentos;
        }
        return null;
    },

    async createTarefa(
        tarefaData: Omit<Tarefa, 'id' | 'created_at' | 'updated_at'>,
        colaboradoresIds: string[]
    ) {
        // 1. Inserir a Tarefa
        const { data: novaTarefa, error: erroTarefa } = await supabase
            .from('tarefas')
            .insert([tarefaData])
            .select()
            .single();

        if (erroTarefa) {
            console.error('Erro ao criar tarefa:', erroTarefa);
            throw erroTarefa;
        }

        // 2. Vincular os Colaboradores
        if (novaTarefa && colaboradoresIds.length > 0) {
            const insertsColaboradores = colaboradoresIds.map(colaborador_id => ({
                empresa_id: novaTarefa.empresa_id,
                tarefa_id: novaTarefa.id,
                colaborador_id
            }));

            const { error: erroColab } = await supabase
                .from('tarefas_colaboradores')
                .insert(insertsColaboradores);

            if (erroColab) {
                console.error('Erro ao vincular colaboradores à tarefa:', erroColab);
                // Não lançar erro duro aqui para não quebrar a tela se a tarefa foi criada
            }
        }

        return novaTarefa;
    },

    async updateTarefa(
        id: string,
        empresaId: string,
        tarefaData: Partial<Tarefa>,
        colaboradoresIds: string[]
    ) {
        // 1. Atualizar a Tarefa Principal
        const { data: tarefaAtualizada, error: erroTarefa } = await supabase
            .from('tarefas')
            .update({ ...tarefaData, updated_at: new Date().toISOString() })
            .eq('id', id)
            .eq('empresa_id', empresaId)
            .select()
            .single();

        if (erroTarefa) {
            console.error('Erro ao atualizar tarefa:', erroTarefa);
            throw erroTarefa;
        }

        // 2. Atualizar Vínculos (Apagar antigos e inserir novos)
        if (tarefaAtualizada) {
            const { error: erroDelete } = await supabase
                .from('tarefas_colaboradores')
                .delete()
                .eq('tarefa_id', id)
                .eq('empresa_id', empresaId);

            if (erroDelete) {
                console.error('Erro ao resetar colaboradores da tarefa:', erroDelete);
            } else if (colaboradoresIds.length > 0) {
                const insertsColaboradores = colaboradoresIds.map(colaborador_id => ({
                    empresa_id: empresaId,
                    tarefa_id: id,
                    colaborador_id
                }));

                const { error: erroInsert } = await supabase
                    .from('tarefas_colaboradores')
                    .insert(insertsColaboradores);

                if (erroInsert) {
                    console.error('Erro ao salvar novos colaboradores da tarefa:', erroInsert);
                }
            }
        }

        return tarefaAtualizada;
    },

    async deleteTarefa(id: string, empresaId: string) {
        const { error } = await supabase
            .from('tarefas')
            .delete()
            .eq('id', id)
            .eq('empresa_id', empresaId);

        if (error) {
            console.error('Erro ao excluir tarefa:', error);
            throw error;
        }
    },

    async concluirTarefa(id: string, empresaId: string, status: 'pendente' | 'concluída') {
        const { data, error } = await supabase
            .from('tarefas')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('id', id)
            .eq('empresa_id', empresaId)
            .select()
            .single();

        if (error) {
            console.error('Erro ao concluir tarefa:', error);
            throw error;
        }

        return data;
    }
};
