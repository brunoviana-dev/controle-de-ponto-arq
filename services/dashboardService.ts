import { supabase } from './supabaseClient';
import { getEmpresaAtualId } from '../utils/config';
import { getCurrentUser } from './authService';
import { UserRole } from './interfaces/types';
import { calculateDailyTotal } from '../utils/timeUtils';

export interface DashboardNotificacao {
    id: string;
    tipo: 'tarefa_atribuida' | 'tarefa_atrasada' | 'etapa_atrasada' | 'parcela_vencendo' | 'conta_vencendo' | 'briefing_novo' | 'pagamento_colaborador';
    mensagem: string;
    link: string;
    referenciaId?: string;
    extraData?: any;
}

export interface DashboardResumo {
    projetos: {
        emAndamento: number;
        naoIniciados: number;
        etapasAtrasadas: number;
    };
    financeiro: {
        totalPrevisto: number;
        totalPago: number;
        totalAPagar: number;
    };
    tarefas: {
        hoje: number;
        atrasadas: number;
    };
    briefings: {
        novos: number;
    };
}

const hoje = new Date();
hoje.setHours(0, 0, 0, 0);

const hojeStr = hoje.toISOString().split('T')[0];

const emDias = (diasAdiante: number) => {
    const d = new Date(hoje);
    d.setDate(d.getDate() + diasAdiante);
    return d.toISOString().split('T')[0];
};

export const getDashboardData = async (): Promise<{
    notificacoes: DashboardNotificacao[];
    resumo: DashboardResumo;
}> => {
    const empresaId = getEmpresaAtualId();
    const user = getCurrentUser();
    const isAdmin = user?.role === UserRole.ADMIN;
    const colaboradorId = user?.id;

    const notificacoes: DashboardNotificacao[] = [];

    // =========================================================================
    // NOTIFICAÇÕES
    // =========================================================================

    // 1. Tarefas atribuídas ao usuário (últimas 7 dias) e tarefas atrasadas
    if (colaboradorId) {
        // Busca tarefas vinculadas ao colaborador
        const { data: tarefasColab } = await supabase
            .from('tarefas_colaboradores')
            .select(`
        tarefa_id,
        tarefas!inner(
          id,
          titulo,
          status,
          data_fim,
          created_at,
          empresa_id
        )
      `)
            .eq('colaborador_id', colaboradorId)
            .eq('empresa_id', empresaId);

        const tarefasDoColaborador = (tarefasColab || []).map((tc: any) => tc.tarefas).filter(Boolean);

        // Novas tarefas atribuídas (últimas 24 horas)
        const limite24h = new Date();
        limite24h.setHours(limite24h.getHours() - 24);
        const novasTarefas = tarefasDoColaborador.filter((t: any) => {
            const criada = new Date(t.created_at);
            return criada >= limite24h && t.status === 'pendente';
        });

        novasTarefas.forEach((t: any) => {
            notificacoes.push({
                id: `tarefa-nova-${t.id}`,
                tipo: 'tarefa_atribuida',
                mensagem: `Nova tarefa atribuída a você: ${t.titulo}`,
                link: '/calendario',
                referenciaId: t.id
            });
        });

        // Tarefas atrasadas (data_fim < hoje e pendente)
        const tarefasAtrasadas = tarefasDoColaborador.filter((t: any) => {
            if (!t.data_fim || t.status === 'concluída') return false;
            return t.data_fim < hojeStr;
        });

        tarefasAtrasadas.forEach((t: any) => {
            notificacoes.push({
                id: `tarefa-atrasada-${t.id}`,
                tipo: 'tarefa_atrasada',
                mensagem: `Tarefa atrasada: ${t.titulo}`,
                link: '/calendario',
                referenciaId: t.id
            });
        });
    }

    // 2. Etapas de projetos atrasadas (somente admin, ou para o colaborador responsável)
    if (isAdmin) {
        const { data: etapasAtrasadas } = await supabase
            .from('projeto_etapas')
            .select(`
        id,
        nome_etapa,
        data_fim_prevista,
        projeto_id,
        projetos!inner(id, nome_projeto)
      `)
            .eq('empresa_id', empresaId)
            .lt('data_fim_prevista', hojeStr)
            .not('status', 'eq', 'concluido')
            .not('status', 'eq', 'cancelado')
            .limit(5);

        (etapasAtrasadas || []).forEach((e: any) => {
            notificacoes.push({
                id: `etapa-atrasada-${e.id}`,
                tipo: 'etapa_atrasada',
                mensagem: `Etapa atrasada: ${e.nome_etapa} no projeto ${e.projetos?.nome_projeto || ''}`,
                link: `/projetos/${e.projeto_id}`,
                referenciaId: e.projeto_id
            });
        });
    } else if (colaboradorId) {
        // Colaborador vê apenas as etapas dele
        const { data: etapasAtrasadasColab } = await supabase
            .from('projeto_etapas')
            .select(`
        id,
        nome_etapa,
        data_fim_prevista,
        projeto_id,
        projetos!inner(id, nome_projeto)
      `)
            .eq('empresa_id', empresaId)
            .eq('colaborador_id', colaboradorId)
            .lt('data_fim_prevista', hojeStr)
            .not('status', 'eq', 'concluido')
            .not('status', 'eq', 'cancelado')
            .limit(3);

        (etapasAtrasadasColab || []).forEach((e: any) => {
            notificacoes.push({
                id: `etapa-atrasada-colab-${e.id}`,
                tipo: 'etapa_atrasada',
                mensagem: `Etapa atrasada: ${e.nome_etapa} no projeto ${e.projetos?.nome_projeto || ''}`,
                link: `/projetos/${e.projeto_id}`,
                referenciaId: e.projeto_id
            });
        });
    }

    // 3. Parcelas de projeto vencendo nos próximos 7 dias (apenas admin)
    if (isAdmin) {
        const em7Dias = emDias(7);
        const { data: parcelasVencendo } = await supabase
            .from('projeto_parcelas')
            .select(`
        id,
        numero_parcela,
        data_vencimento,
        valor_parcela,
        projeto_id,
        projetos!inner(id, nome_projeto)
      `)
            .eq('empresa_id', empresaId)
            .eq('status', 'pendente')
            .gte('data_vencimento', hojeStr)
            .lte('data_vencimento', em7Dias)
            .order('data_vencimento', { ascending: true })
            .limit(3);

        (parcelasVencendo || []).forEach((p: any) => {
            const dataFormatada = p.data_vencimento
                ? new Date(p.data_vencimento + 'T12:00:00').toLocaleDateString('pt-BR')
                : '';
            notificacoes.push({
                id: `parcela-${p.id}`,
                tipo: 'parcela_vencendo',
                mensagem: `Parcela ${p.numero_parcela} do projeto "${p.projetos?.nome_projeto}" vence em ${dataFormatada}`,
                link: '/admin/recebimentos',
                referenciaId: p.projeto_id
            });
        });
    }

    // 4. Contas a pagar vencendo nos próximos 7 dias (apenas admin)
    if (isAdmin) {
        const em7Dias = emDias(7);
        const { data: contasVencendo } = await supabase
            .from('contas_pagar')
            .select('id, descricao, data_vencimento, valor')
            .eq('empresa_id', empresaId)
            .gte('data_vencimento', hojeStr)
            .lte('data_vencimento', em7Dias)
            .order('data_vencimento', { ascending: true })
            .limit(3);

        (contasVencendo || []).forEach((c: any) => {
            const dataFormatada = c.data_vencimento
                ? new Date(c.data_vencimento + 'T12:00:00').toLocaleDateString('pt-BR')
                : '';
            notificacoes.push({
                id: `conta-${c.id}`,
                tipo: 'conta_vencendo',
                mensagem: `Conta a pagar "${c.descricao}" vence em ${dataFormatada}`,
                link: '/admin/financeiro/contas-pagar',
                referenciaId: c.id
            });
        });
    }

    // 5. Novos briefings (últimas 48 horas, apenas admin)
    if (isAdmin) {
        const limite48h = new Date();
        limite48h.setHours(limite48h.getHours() - 48);
        const limite48hIso = limite48h.toISOString();

        const { data: novosBriefings } = await supabase
            .from('briefing_respostas')
            .select('id, nome, created_at')
            .eq('empresa_id', empresaId)
            .eq('status', 'novo')
            .gte('created_at', limite48hIso)
            .order('created_at', { ascending: false })
            .limit(5);

        (novosBriefings || []).forEach((b: any) => {
            notificacoes.push({
                id: `briefing-${b.id}`,
                tipo: 'briefing_novo',
                mensagem: `Nova resposta de briefing recebida de ${b.nome}`,
                link: '/admin/briefing-respostas',
                referenciaId: b.id
            });
        });
    }

    // 6. Pagamentos de colaboradores pendentes (mês de referência)
    const mesAtualNotif = hoje.getMonth() + 1;
    const anoAtualNotif = hoje.getFullYear();
    let mesRefNotif = mesAtualNotif - 1;
    let anoRefNotif = anoAtualNotif;
    if (mesRefNotif === 0) {
        mesRefNotif = 12;
        anoRefNotif = anoAtualNotif - 1;
    }

    if (isAdmin) {
        const { data: colaboradoresData } = await supabase
            .from('colaboradores')
            .select('id, nome, valor_hora, valor_inss_fixo, perfil')
            .eq('empresa_id', empresaId)
            .neq('perfil', 'admin');

        const { data: folhasMes } = await supabase
            .from('folhas_ponto')
            .select('colaborador_id, dias, valor_total_calculado, valor_pago_final, status_pagamento')
            .eq('empresa_id', empresaId)
            .eq('mes', mesRefNotif)
            .eq('ano', anoRefNotif);

        const folhasPorColab = new Map<string, any>();
        (folhasMes || []).forEach((f: any) => folhasPorColab.set(f.colaborador_id, f));

        for (const colab of (colaboradoresData || [])) {
            const folha = folhasPorColab.get(colab.id);

            // Só notifica se tiver dias registrados E não estiver pago
            if (folha?.status_pagamento !== 'pago' && folha?.dias && Array.isArray(folha.dias) && folha.dias.some((d: any) => d.entrada1 || d.extraEntrada1)) {
                // Cálculo simplificado de realtime para a notificação
                let totalMinutos = 0;
                folha.dias.forEach((d: any) => {
                    const normal = calculateDailyTotal(d.entrada1 || '', d.saida1 || '', d.entrada2 || '', d.saida2 || '');
                    const extra = calculateDailyTotal(d.extraEntrada1 || '', d.extraSaida1 || '', d.extraEntrada2 || '', d.extraSaida2 || '');
                    totalMinutos += normal + extra;
                });

                const totalHoras = totalMinutos / 60;
                const valorTotal = totalHoras * Number(colab.valor_hora || 0);
                const valorInss = Number(colab.valor_inss_fixo || 0);
                const totalPagar = Math.max(0, valorTotal - valorInss);

                if (totalPagar > 0) {
                    notificacoes.push({
                        id: `pag-colab-${colab.id}`,
                        tipo: 'pagamento_colaborador',
                        mensagem: `Pagamento pendente para ${colab.nome}`,
                        link: '/admin/relatorios',
                        referenciaId: colab.id,
                        extraData: {
                            colaboradorId: colab.id,
                            colaboradorNome: colab.nome,
                            mes: mesRefNotif,
                            ano: anoRefNotif,
                            totalHorasNormais: 0, // Não precisamos pra esse modal
                            totalHorasExtras: 0,
                            totalGeral: totalMinutos,
                            valorHora: Number(colab.valor_hora || 0),
                            totalPagar,
                            statusPagamento: 'pendente',
                            valorTotalCalculado: valorTotal,
                            valorInss
                        }
                    });
                }
            }
        }
    }

    // =========================================================================
    // RESUMO (CARDS)
    // =========================================================================

    const mesAtual = hoje.getMonth() + 1;
    const anoAtual = hoje.getFullYear();

    // --- PROJETOS ---
    let projetosEmAndamento = 0;
    let projetosNaoIniciados = 0;
    let etapasAtrasadasCount = 0;

    if (isAdmin) {
        const [{ count: countAndamento }, { count: countNaoIniciado }, { count: countEtapas }] = await Promise.all([
            supabase
                .from('projetos')
                .select('id', { count: 'exact', head: true })
                .eq('empresa_id', empresaId)
                .eq('status', 'em_andamento'),
            supabase
                .from('projetos')
                .select('id', { count: 'exact', head: true })
                .eq('empresa_id', empresaId)
                .eq('status', 'nao_iniciado'),
            supabase
                .from('projeto_etapas')
                .select('id', { count: 'exact', head: true })
                .eq('empresa_id', empresaId)
                .lt('data_fim_prevista', hojeStr)
                .not('status', 'eq', 'concluido')
                .not('status', 'eq', 'cancelado')
        ]);

        projetosEmAndamento = countAndamento || 0;
        projetosNaoIniciados = countNaoIniciado || 0;
        etapasAtrasadasCount = countEtapas || 0;
    } else if (colaboradorId) {
        // Colaborador vê projetos com etapas atribuídas a ele
        const { data: etapasColab } = await supabase
            .from('projeto_etapas')
            .select('projeto_id, status')
            .eq('empresa_id', empresaId)
            .eq('colaborador_id', colaboradorId);

        const projetoIdsUnicos = [...new Set((etapasColab || []).map((e: any) => e.projeto_id))];
        projetosEmAndamento = projetoIdsUnicos.length;

        const { count: countEtapas } = await supabase
            .from('projeto_etapas')
            .select('id', { count: 'exact', head: true })
            .eq('empresa_id', empresaId)
            .eq('colaborador_id', colaboradorId)
            .lt('data_fim_prevista', hojeStr)
            .not('status', 'eq', 'concluido')
            .not('status', 'eq', 'cancelado');

        etapasAtrasadasCount = countEtapas || 0;
    }

    // --- FINANCEIRO DO MÊS (apenas admin) ---
    // Lógica idêntica ao ReportsPage:
    // O relatório de pagamento exibe o mês ANTERIOR ao mês selecionado.
    // No dashboard exibimos o mês de referência = mês atual - 1.
    let totalPrevisto = 0;
    let totalPago = 0;

    if (isAdmin) {
        // Mês de referência: igual ao que o ReportsPage calcula ao selecionar o mês atual
        let mesRef = mesAtual - 1;
        let anoRef = anoAtual;
        if (mesRef === 0) {
            mesRef = 12;
            anoRef = anoAtual - 1;
        }

        // ── 1. COLABORADORES: replicar cálculo do ReportsPage ─────────────────
        // Buscar todos os colaboradores não-admin da empresa
        const { data: colaboradoresData } = await supabase
            .from('colaboradores')
            .select('id, valor_hora, valor_inss_fixo, perfil')
            .eq('empresa_id', empresaId)
            .neq('perfil', 'admin');

        // Buscar todas as folhas do mês de referência de uma vez só
        const { data: folhasMes } = await supabase
            .from('folhas_ponto')
            .select('colaborador_id, dias, valor_total_calculado, valor_pago_final, status_pagamento')
            .eq('empresa_id', empresaId)
            .eq('mes', mesRef)
            .eq('ano', anoRef);

        const folhasPorColab = new Map<string, any>();
        (folhasMes || []).forEach((f: any) => folhasPorColab.set(f.colaborador_id, f));

        for (const colab of (colaboradoresData || [])) {
            const folha = folhasPorColab.get(colab.id);

            if (folha?.status_pagamento === 'pago') {
                // Folha bloqueada: usa snapshot exatamente como no ReportsPage
                const valorPago = Number(folha.valor_pago_final || 0);
                totalPrevisto += valorPago;
                totalPago += valorPago;
            } else if (folha?.dias) {
                // Folha pendente: calcular horas em tempo real (igual ao ReportsPage)
                let totalMinutos = 0;
                const dias = Array.isArray(folha.dias) ? folha.dias : [];
                dias.forEach((d: any) => {
                    const normal = calculateDailyTotal(d.entrada1 || '', d.saida1 || '', d.entrada2 || '', d.saida2 || '');
                    const extra = calculateDailyTotal(d.extraEntrada1 || '', d.extraSaida1 || '', d.extraEntrada2 || '', d.extraSaida2 || '');
                    totalMinutos += normal + extra;
                });
                const totalHoras = totalMinutos / 60;
                const valorHora = Number(colab.valor_hora || 0);
                const valorInss = Number(colab.valor_inss_fixo || 0);
                const valorTotal = totalHoras * valorHora;
                const totalPagar = Math.max(0, valorTotal - valorInss);
                totalPrevisto += totalPagar;
                // Folha pendente = não paga ainda, não soma ao totalPago
            }
            // Se não tem folha para o mês, não soma nada (sem horas registradas)
        }

        // ── 2. CONTAS A PAGAR: mês atual da view do dashboard ─────────────────
        // (Contas a pagar são do calendário real, não do mês de referência)
        const inicioDeMes = `${anoAtual}-${String(mesAtual).padStart(2, '0')}-01`;
        const ultimoDia = new Date(anoAtual, mesAtual, 0).getDate();
        const fimDeMes = `${anoAtual}-${String(mesAtual).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`;

        const { data: contasMes } = await supabase
            .from('contas_pagar')
            .select('id, valor, recorrente, data_vencimento')
            .eq('empresa_id', empresaId)
            .or(`data_vencimento.gte.${inicioDeMes},recorrente.eq.true`)
            .lte('data_vencimento', fimDeMes);

        const { data: pagamentosContas } = await supabase
            .from('contas_pagar_pagamentos')
            .select('valor_pago')
            .eq('empresa_id', empresaId)
            .eq('mes_referencia', mesAtual)
            .eq('ano_referencia', anoAtual);

        const totalContasPrevistas = (contasMes || []).reduce((acc: number, c: any) => acc + Number(c.valor || 0), 0);
        const totalContasPagas = (pagamentosContas || []).reduce((acc: number, p: any) => acc + Number(p.valor_pago || 0), 0);

        totalPrevisto += totalContasPrevistas;
        totalPago += totalContasPagas;
    }

    // --- TAREFAS ---
    let tarefasHojeCount = 0;
    let tarefasAtrasadasCount = 0;

    const buildTarefasQuery = () => {
        let q = supabase
            .from('tarefas')
            .select('id, data_fim, data_inicio, dia_inteiro, status, tarefas_colaboradores(colaborador_id)')
            .eq('empresa_id', empresaId)
            .neq('status', 'concluída');

        return q;
    };

    const { data: todasTarefas } = await buildTarefasQuery();

    const tarefasFiltradas = isAdmin
        ? (todasTarefas || [])
        : (todasTarefas || []).filter((t: any) =>
            t.tarefas_colaboradores?.some((tc: any) => tc.colaborador_id === colaboradorId)
        );

    tarefasFiltradas.forEach((t: any) => {
        const dataFim = t.data_fim;
        const dataInicio = t.data_inicio;
        if (dataFim && dataFim < hojeStr) {
            tarefasAtrasadasCount++;
        } else if (dataInicio === hojeStr || dataFim === hojeStr) {
            tarefasHojeCount++;
        }
    });

    // --- BRIEFINGS (apenas admin) ---
    let novoBriefingsCount = 0;

    if (isAdmin) {
        const { count: countBriefings } = await supabase
            .from('briefing_respostas')
            .select('id', { count: 'exact', head: true })
            .eq('empresa_id', empresaId)
            .eq('status', 'novo');

        novoBriefingsCount = countBriefings || 0;
    }

    return {
        notificacoes,
        resumo: {
            projetos: {
                emAndamento: projetosEmAndamento,
                naoIniciados: projetosNaoIniciados,
                etapasAtrasadas: etapasAtrasadasCount
            },
            financeiro: {
                totalPrevisto,
                totalPago,
                totalAPagar: totalPrevisto - totalPago
            },
            tarefas: {
                hoje: tarefasHojeCount,
                atrasadas: tarefasAtrasadasCount
            },
            briefings: {
                novos: novoBriefingsCount
            }
        }
    };
};
