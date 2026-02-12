export const formatStatus = (status: string) => {
    switch (status) {
        case 'planejamento': return 'Planejamento';
        case 'em_andamento': return 'Em Andamento';
        case 'concluido': return 'Concluído';
        case 'cancelado': return 'Cancelado';
        case 'nao_iniciado': return 'Não Iniciado';
        default: return status;
    }
};

export const getStatusBadgeClass = (status: string) => {
    switch (status) {
        case 'planejamento': return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
        case 'em_andamento': return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
        case 'concluido': return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
        case 'cancelado': return 'bg-red-500/10 text-red-400 border border-red-500/20';
        case 'nao_iniciado': return 'bg-slate-500/10 text-slate-400 border border-slate-500/20';
        default: return 'bg-slate-500/10 text-slate-400 border border-slate-500/20';
    }
};
