import React from 'react';
import { TarefaComRelacionamentos } from '../../../services/tarefasService';
import { ProjetoEtapa } from '../../../services/interfaces/types';

export type VisaoCalendario = 'mes' | 'semana' | 'dia';

interface CalendarGridProps {
    tarefas: TarefaComRelacionamentos[];
    etapas: (ProjetoEtapa & { projeto?: { nome_projeto: string } })[];
    visao: VisaoCalendario;
    dataBase: Date;
    onTarefaClick: (item: TarefaLocal) => void;
}

export interface TarefaLocal {
    id: string;
    isVirtual: boolean; // true para projeto_etapas, false para tarefas manuais
    titulo: string;
    data_inicio: Date;
    data_fim: Date;
    dia_inteiro: boolean;
    hora_inicio?: string;
    hora_fim?: string;
    status: string;
    originalData: any; // TarefaComRelacionamentos | ProjetoEtapa
}

const CalendarGrid: React.FC<CalendarGridProps> = ({ tarefas, etapas, visao, dataBase, onTarefaClick }) => {
    // 1. Unificar Tarefas e Etapas
    const eventos: TarefaLocal[] = [
        ...tarefas.map(t => ({
            id: t.id,
            isVirtual: false,
            titulo: t.titulo,
            data_inicio: new Date(t.data_inicio + 'T00:00:00'),
            data_fim: t.data_fim ? new Date(t.data_fim + 'T00:00:00') : new Date(t.data_inicio + 'T00:00:00'),
            dia_inteiro: t.dia_inteiro,
            hora_inicio: t.hora_inicio,
            hora_fim: t.hora_fim,
            status: t.status,
            originalData: t
        })),
        ...etapas.filter(e => e.dataInicioPrevista).map(e => ({
            id: e.id,
            isVirtual: true,
            titulo: `[P] ${e.projeto?.nome_projeto || 'Projeto'} - ${e.nomeEtapa}`,
            data_inicio: new Date(e.dataInicioPrevista! + 'T00:00:00'),
            data_fim: e.dataFimPrevista ? new Date(e.dataFimPrevista + 'T00:00:00') : new Date(e.dataInicioPrevista! + 'T00:00:00'),
            dia_inteiro: true, // Etapas são sempre dia inteiro
            status: e.status,
            originalData: e
        }))
    ];

    // Helper para Cores
    const getCorEvento = (evento: TarefaLocal) => {
        if (evento.status === 'concluída' || evento.status === 'concluido') {
            return 'bg-green-500/20 text-green-300 border border-green-500/30';
        }
        if (evento.isVirtual || evento.originalData.projeto_id) {
            // Tarefas de projeto ou etapas virtuais
            return 'bg-blue-500/20 text-blue-300 border border-blue-500/30';
        }
        // Tarefas independentes
        return 'bg-purple-500/20 text-purple-300 border border-purple-500/30';
    };

    const isMesmoDia = (d1: Date, d2: Date) => {
        return d1.getDate() === d2.getDate() &&
            d1.getMonth() === d2.getMonth() &&
            d1.getFullYear() === d2.getFullYear();
    };

    const isDentroDoPeriodo = (dataAlvo: Date, dataInicio: Date, dataFim: Date) => {
        // Zera as horas para comparar apenas os dias
        const alvo = new Date(dataAlvo.getFullYear(), dataAlvo.getMonth(), dataAlvo.getDate()).getTime();
        const inicio = new Date(dataInicio.getFullYear(), dataInicio.getMonth(), dataInicio.getDate()).getTime();
        const fim = new Date(dataFim.getFullYear(), dataFim.getMonth(), dataFim.getDate()).getTime();
        return alvo >= inicio && alvo <= fim;
    };

    const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    // Renderização da Visão MENSAL
    const renderVisaoMes = () => {
        const ano = dataBase.getFullYear();
        const mes = dataBase.getMonth();
        const primeiroDiaMes = new Date(ano, mes, 1);
        const ultimoDiaMes = new Date(ano, mes + 1, 0);
        const diaSemanaInicio = primeiroDiaMes.getDay(); // 0=Dom

        // Padding do mês anterior + dias do mês atual (sem dias do próximo mês)
        const dias: (Date | null)[] = [];

        for (let i = diaSemanaInicio - 1; i >= 0; i--) {
            dias.push(new Date(ano, mes, -i));
        }
        for (let i = 1; i <= ultimoDiaMes.getDate(); i++) {
            dias.push(new Date(ano, mes, i));
        }
        // Preenche com null até completar a última linha (múltiplo de 7)
        while (dias.length % 7 !== 0) {
            dias.push(null);
        }

        // Agrupar em semanas
        const semanas: (Date | null)[][] = [];
        for (let i = 0; i < dias.length; i += 7) {
            semanas.push(dias.slice(i, i + 7));
        }

        const getEventoSpan = (evento: TarefaLocal, semana: (Date | null)[]) => {
            const diasValidos = semana.filter(d => d !== null) as Date[];
            if (diasValidos.length === 0) return null;
            const inicioSemana = diasValidos[0];
            const fimSemana = diasValidos[diasValidos.length - 1];
            const inicioEvento = evento.data_inicio > inicioSemana ? evento.data_inicio : inicioSemana;
            const fimEvento = evento.data_fim < fimSemana ? evento.data_fim : fimSemana;
            const colStart = semana.findIndex(d => d && isMesmoDia(d, inicioEvento));
            const colEnd = semana.findIndex(d => d && isMesmoDia(d, fimEvento));
            if (colStart === -1) return null;
            const span = (colEnd === -1 ? 6 : colEnd) - colStart + 1;
            return { colStart, span };
        };

        const eventosNaSemana = (semana: (Date | null)[]) => {
            const diasValidos = semana.filter(Boolean) as Date[];
            if (diasValidos.length === 0) return [];
            const inicioSemana = diasValidos[0];
            const fimSemana = diasValidos[diasValidos.length - 1];
            return eventos.filter(ev => ev.data_inicio <= fimSemana && ev.data_fim >= inicioSemana);
        };

        return (
            <div className="flex flex-col h-full bg-surface border border-slate-700/50 rounded-xl overflow-hidden shadow-xl">
                {/* Header – dias da semana */}
                <div className="grid grid-cols-7 border-b border-slate-700/50 bg-slate-800/80 flex-shrink-0">
                    {diasSemana.map(d => (
                        <div key={d} className="py-2 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">{d}</div>
                    ))}
                </div>

                {/* Semanas */}
                <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar">
                    {semanas.map((semana, si) => {
                        const evsSemana = eventosNaSemana(semana);

                        // Organiza eventos em "tracks" (linhas) para evitar sobreposição
                        const tracks: (TarefaLocal | null)[][] = [];
                        evsSemana.forEach(ev => {
                            const span = getEventoSpan(ev, semana);
                            if (!span) return;
                            let trackIdx = tracks.findIndex(track => {
                                for (let c = span.colStart; c < span.colStart + span.span; c++) {
                                    if (track[c] !== null && track[c] !== undefined) return false;
                                }
                                return true;
                            });
                            if (trackIdx === -1) {
                                tracks.push(new Array(7).fill(null));
                                trackIdx = tracks.length - 1;
                            }
                            for (let c = span.colStart; c < span.colStart + span.span; c++) {
                                tracks[trackIdx][c] = ev;
                            }
                        });

                        const eventosHeight = tracks.length * 22;

                        return (
                            <div
                                key={si}
                                className="grid grid-cols-7 border-b border-slate-700/30 relative flex-shrink-0"
                                style={{ minHeight: `${Math.max(36 + eventosHeight, 80)}px` }}
                            >
                                {/* Células de fundo com número do dia */}
                                {semana.map((dia, di) => {
                                    if (!dia) return <div key={di} className="border-r border-slate-700/30 bg-surface/40" />;
                                    const isMesAtual = dia.getMonth() === mes;
                                    const isHoje = isMesmoDia(dia, new Date());
                                    return (
                                        <div key={di} className={`border-r border-slate-700/30 p-1.5 transition-colors ${!isMesAtual ? 'bg-surface/40' : 'bg-surface hover:bg-slate-800/20'}`}>
                                            <span className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full
                                                ${isHoje ? 'bg-primary text-white shadow-md shadow-primary/20' : !isMesAtual ? 'text-slate-600' : 'text-slate-300'}`}>
                                                {dia.getDate()}
                                            </span>
                                        </div>
                                    );
                                })}

                                {/* Eventos (posição absoluta sobre as células) */}
                                <div className="absolute inset-0 pointer-events-none" style={{ top: '30px' }}>
                                    {tracks.map((track, ti) =>
                                        track.map((ev, ci) => {
                                            if (!ev) return null;
                                            // Renderizar apenas na primeira célula do span
                                            if (ci > 0 && track[ci - 1]?.id === ev.id) return null;

                                            let spanCount = 1;
                                            for (let k = ci + 1; k < 7; k++) {
                                                if (track[k]?.id === ev.id) spanCount++;
                                                else break;
                                            }

                                            // Calcular se é o início real e o fim real do evento
                                            const isInicio = semana[ci] ? isMesmoDia(ev.data_inicio, semana[ci]!) : false;
                                            const isUltimaCelula = ci + spanCount - 1;
                                            const isFim = semana[Math.min(isUltimaCelula, 6)] ? isMesmoDia(ev.data_fim, semana[Math.min(isUltimaCelula, 6)]!) : false;
                                            // Sempre mostrar título na primeira célula visível (mesmo que o evento comece antes do mês)
                                            const mostrarTitulo = true;

                                            return (
                                                <div
                                                    key={`${ev.id}-${si}-${ti}-${ci}`}
                                                    className="pointer-events-auto absolute"
                                                    style={{
                                                        left: `calc(${(ci / 7) * 100}% + 2px)`,
                                                        width: `calc(${(spanCount / 7) * 100}% - 4px)`,
                                                        top: `${ti * 22}px`,
                                                        height: '20px',
                                                        zIndex: 10,
                                                    }}
                                                    onClick={() => onTarefaClick(ev)}
                                                >
                                                    <div
                                                        className={`h-full flex items-center px-1.5 text-[10px] cursor-pointer transition-all hover:brightness-125
                                                            ${getCorEvento(ev)}
                                                            ${isInicio ? 'rounded-l-md' : 'rounded-l-none border-l-0'}
                                                            ${isFim ? 'rounded-r-md' : 'rounded-r-none border-r-0'}`}
                                                        title={ev.titulo}
                                                    >
                                                        {mostrarTitulo && (
                                                            <span className="truncate font-medium flex items-center gap-1">
                                                                {/* Indicar com seta se o evento vem de antes */}
                                                                {!isInicio && <span className="opacity-60 flex-shrink-0">◄</span>}
                                                                {!ev.dia_inteiro && ev.hora_inicio && isInicio && (
                                                                    <span className="font-bold mr-1 opacity-80">{ev.hora_inicio.slice(0, 5)}</span>
                                                                )}
                                                                {ev.titulo}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    // Renderização da Visão SEMANAL com suporte a cards multi-dia
    const renderVisaoSemana = () => {
        const diaAtual = dataBase.getDay();
        const dataInicioSemana = new Date(dataBase);
        dataInicioSemana.setDate(dataBase.getDate() - diaAtual);

        const dias = Array.from({ length: 7 }).map((_, i) => {
            const d = new Date(dataInicioSemana);
            d.setDate(dataInicioSemana.getDate() + i);
            return d;
        });

        const inicioSemana = dias[0];
        const fimSemana = dias[6];

        // Eventos da semana
        const evsSemana = eventos.filter(ev => ev.data_inicio <= fimSemana && ev.data_fim >= inicioSemana);

        // Separar eventos de dia-inteiro/multi-dia dos eventos de hora específica
        const evsDiaInteiro = evsSemana.filter(ev => ev.dia_inteiro || ev.data_inicio.getTime() !== ev.data_fim.getTime());
        const evsHora = evsSemana.filter(ev => !ev.dia_inteiro && ev.data_inicio.getTime() === ev.data_fim.getTime());

        // Organizar eventos de dia-inteiro em tracks (igual ao mensal)
        const tracks: (TarefaLocal | null)[][] = [];
        evsDiaInteiro.forEach(ev => {
            const colStart = dias.findIndex(d => {
                const evInicio = ev.data_inicio > inicioSemana ? ev.data_inicio : inicioSemana;
                return isMesmoDia(d, evInicio);
            });
            const evFim = ev.data_fim < fimSemana ? ev.data_fim : fimSemana;
            const colEnd = dias.findIndex(d => isMesmoDia(d, evFim));
            const start = colStart === -1 ? 0 : colStart;
            const end = colEnd === -1 ? 6 : colEnd;
            const span = end - start + 1;

            let trackIdx = tracks.findIndex(track => {
                for (let c = start; c < start + span; c++) {
                    if (track[c] !== null && track[c] !== undefined) return false;
                }
                return true;
            });
            if (trackIdx === -1) {
                tracks.push(new Array(7).fill(null));
                trackIdx = tracks.length - 1;
            }
            for (let c = start; c < start + span; c++) {
                tracks[trackIdx][c] = ev;
            }
        });

        const tracksHeight = tracks.length * 26;

        return (
            <div className="flex flex-col h-full bg-surface border border-slate-700/50 rounded-xl overflow-hidden shadow-xl">
                {/* Header – dias */}
                <div className="grid grid-cols-7 border-b border-slate-700/50 bg-slate-800/80 flex-shrink-0">
                    {dias.map(dia => (
                        <div key={dia.getTime()} className="py-2 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider flex flex-col items-center gap-1">
                            <span>{diasSemana[dia.getDay()]}</span>
                            <span className={`w-8 h-8 flex items-center justify-center rounded-full text-sm ${isMesmoDia(dia, new Date()) ? 'bg-primary text-white' : 'text-slate-200'}`}>
                                {dia.getDate()}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Faixa de eventos multi-dia (dia inteiro) */}
                {tracks.length > 0 && (
                    <div
                        className="relative border-b border-slate-700/50 bg-slate-800/30 flex-shrink-0"
                        style={{ height: `${tracksHeight + 4}px` }}
                    >
                        {tracks.map((track, ti) =>
                            track.map((ev, ci) => {
                                if (!ev) return null;
                                if (ci > 0 && track[ci - 1]?.id === ev.id) return null;

                                let spanCount = 1;
                                for (let k = ci + 1; k < 7; k++) {
                                    if (track[k]?.id === ev.id) spanCount++;
                                    else break;
                                }

                                const isInicio = isMesmoDia(ev.data_inicio, dias[ci]);
                                const ultimaCelula = Math.min(ci + spanCount - 1, 6);
                                const isFim = isMesmoDia(ev.data_fim, dias[ultimaCelula]);

                                return (
                                    <div
                                        key={`wk-${ev.id}-${ti}-${ci}`}
                                        className="absolute pointer-events-auto"
                                        style={{
                                            left: `calc(${(ci / 7) * 100}% + 2px)`,
                                            width: `calc(${(spanCount / 7) * 100}% - 4px)`,
                                            top: `${2 + ti * 26}px`,
                                            height: '22px',
                                            zIndex: 10,
                                        }}
                                        onClick={() => onTarefaClick(ev)}
                                    >
                                        <div
                                            className={`h-full flex items-center px-2 text-[11px] font-medium cursor-pointer transition-all hover:brightness-125
                                                ${getCorEvento(ev)}
                                                ${isInicio ? 'rounded-l-md' : 'rounded-l-none border-l-0'}
                                                ${isFim ? 'rounded-r-md' : 'rounded-r-none border-r-0'}`}
                                            title={ev.titulo}
                                        >
                                            <span className="truncate flex items-center gap-1">
                                                {!isInicio && <span className="opacity-60 flex-shrink-0">◄</span>}
                                                {ev.titulo}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}

                {/* Corpo – eventos com hora específica (por coluna) */}
                <div className="flex-1 grid grid-cols-7 min-h-[400px] overflow-y-auto">
                    {dias.map((dia, di) => {
                        const evsDia = evsHora.filter(e => isDentroDoPeriodo(dia, e.data_inicio, e.data_fim));
                        return (
                            <div key={dia.getTime()} className="border-r border-slate-700/30 p-2 flex flex-col hover:bg-slate-800/30 transition-colors">
                                <div className="space-y-2">
                                    {evsDia.sort((a, b) => (a.hora_inicio || '').localeCompare(b.hora_inicio || '')).map(ev => (
                                        <div
                                            key={ev.id}
                                            onClick={() => onTarefaClick(ev)}
                                            className={`text-xs p-2 rounded cursor-pointer transition-all hover:brightness-125 shadow-sm ${getCorEvento(ev)}`}
                                        >
                                            {ev.hora_inicio && (
                                                <div className="font-semibold opacity-80 mb-0.5 text-[10px]">{ev.hora_inicio.slice(0, 5)}</div>
                                            )}
                                            <div className="font-medium line-clamp-2 leading-tight">{ev.titulo}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    // Renderização da Visão DIÁRIA
    const renderVisaoDia = () => {
        const eventosDoDia = eventos.filter(e => isDentroDoPeriodo(dataBase, e.data_inicio, e.data_fim));

        return (
            <div className="bg-surface border border-slate-700/50 rounded-xl p-4 md:p-6 shadow-xl min-h-[500px]">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                    <span className="bg-primary text-white w-10 h-10 rounded-full flex items-center justify-center shadow-lg shadow-primary/20">
                        {dataBase.getDate()}
                    </span>
                    <span className="text-slate-300 font-medium">
                        {dataBase.toLocaleDateString('pt-BR', { weekday: 'long', month: 'long', year: 'numeric' })}
                    </span>
                </h3>

                {eventosDoDia.length === 0 ? (
                    <div className="text-center text-slate-500 py-10">
                        <span className="text-4xl mb-3 block">☕</span>
                        <p>Nenhuma tarefa agendada para este dia.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {eventosDoDia
                            .sort((a, b) => {
                                if (a.dia_inteiro && !b.dia_inteiro) return -1;
                                if (!a.dia_inteiro && b.dia_inteiro) return 1;
                                if (a.hora_inicio && b.hora_inicio) return a.hora_inicio.localeCompare(b.hora_inicio);
                                return 0;
                            })
                            .map(ev => (
                                <div
                                    key={ev.id}
                                    onClick={() => onTarefaClick(ev)}
                                    className={`
                                    flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-lg
                                    ${getCorEvento(ev)}
                                `}
                                >
                                    <div className="w-16 flex-shrink-0 text-center font-bold opacity-80 flex flex-col">
                                        {ev.dia_inteiro ? (
                                            <span className="text-xs uppercase tracking-widest">O Dia Todo</span>
                                        ) : (
                                            <>
                                                <span>{ev.hora_inicio?.slice(0, 5) || '--:--'}</span>
                                                {ev.hora_fim && <span className="text-xs opacity-60">até {ev.hora_fim.slice(0, 5)}</span>}
                                            </>
                                        )}
                                    </div>
                                    <div className="w-px h-8 bg-current opacity-20"></div>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-sm md:text-base leading-tight mb-1">{ev.titulo}</h4>
                                        {!ev.isVirtual && ev.originalData.descricao && (
                                            <p className="text-xs opacity-80 line-clamp-1">{ev.originalData.descricao}</p>
                                        )}
                                    </div>
                                    <div className="hidden md:flex items-center text-xs px-2 py-1 rounded bg-black/20 font-medium tracking-wide">
                                        {ev.status.toUpperCase()}
                                    </div>
                                </div>
                            ))
                        }
                    </div>
                )}
            </div>
        );
    };

    return (
        <>
            {visao === 'mes' && renderVisaoMes()}
            {visao === 'semana' && renderVisaoSemana()}
            {visao === 'dia' && renderVisaoDia()}
        </>
    );
};

export default CalendarGrid;
