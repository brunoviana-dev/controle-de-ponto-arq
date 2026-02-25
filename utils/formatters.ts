
export const formatStatus = (status: string | undefined): string => {
    if (!status) return '-';

    const statusMap: Record<string, string> = {
        'nao_iniciado': 'Não Iniciado',
        'em_andamento': 'Em Andamento',
        'concluido': 'Concluído',
        'cancelado': 'Cancelado'
    };

    return statusMap[status.toLowerCase()] || status;
};

export const getStatusBadgeClass = (status: string | undefined): string => {
    if (!status) return 'bg-slate-700 text-slate-300';

    const s = status.toLowerCase();
    switch (s) {
        case 'nao_iniciado':
            return 'bg-slate-500/10 border border-slate-500 text-slate-400';
        case 'em_andamento':
            return 'bg-amber-500/10 border border-amber-500 text-amber-500';
        case 'concluido':
            return 'bg-emerald-500/10 border border-emerald-500 text-emerald-500';
        case 'cancelado':
            return 'bg-red-500/10 border border-red-500 text-red-500';
        default:
            return 'bg-slate-700 text-slate-300';
    }
};
export const formatCurrency = (value: number | undefined | null): string => {
    if (value === undefined || value === null) return 'Não informado';
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
};

/**
 * Converte uma query string YYYY-MM-DD para objeto Date em horário local (00:00:00)
 */
export const parseLocalDate = (dateStr: string | undefined | null): Date | null => {
    if (!dateStr) return null;
    if (dateStr.includes('-') && !dateStr.includes('T')) {
        const [year, month, day] = dateStr.split('-').map(Number);
        return new Date(year, month - 1, day);
    }
    return new Date(dateStr);
};

/**
 * Formata uma data para exibição (DD/MM/AAAA) garantindo horário local para strings YYYY-MM-DD
 */
export const formatDate = (dateStr: string | undefined | null): string => {
    if (!dateStr) return 'Não informado';
    const date = parseLocalDate(dateStr);
    return date ? date.toLocaleDateString('pt-BR') : 'Data inválida';
};
