import { supabase } from './supabaseClient';
import { ContaPagar } from './interfaces/types';

export const contasPagarService = {
    async getContasPorMes(mes: number, ano: number): Promise<ContaPagar[]> {
        const startDate = new Date(ano, mes - 1, 1).toISOString().split('T')[0];
        const endDate = new Date(ano, mes, 0).toISOString().split('T')[0];

        const { data, error } = await supabase
            .from('contas_pagar')
            .select('*')
            .gte('data_vencimento', startDate)
            .lte('data_vencimento', endDate)
            .order('data_vencimento', { ascending: true });

        if (error) {
            console.error('Erro ao buscar contas a pagar:', error);
            throw error;
        }

        return data || [];
    },

    async createConta(conta: Omit<ContaPagar, 'id' | 'created_at'>): Promise<ContaPagar> {
        const { data, error } = await supabase
            .from('contas_pagar')
            .insert([conta])
            .select()
            .single();

        if (error) {
            console.error('Erro ao criar conta a pagar:', error);
            throw error;
        }

        return data;
    },

    async updateConta(id: string, conta: Partial<Omit<ContaPagar, 'id' | 'created_at'>>): Promise<ContaPagar> {
        const { data, error } = await supabase
            .from('contas_pagar')
            .update(conta)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Erro ao atualizar conta a pagar:', error);
            throw error;
        }

        return data;
    },

    async deleteConta(id: string): Promise<void> {
        const { error } = await supabase
            .from('contas_pagar')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Erro ao deletar conta a pagar:', error);
            throw error;
        }
    },

    async getById(id: string): Promise<{ data: ContaPagar | null, error: any }> {
        const { data, error } = await supabase
            .from('contas_pagar')
            .select('*')
            .eq('id', id)
            .single();

        return { data, error };
    }
};
