import React, { useEffect, useState, useMemo } from 'react';
import { Colaborador, FolhaPonto, PontoDia } from '../services/interfaces/types';
import { getColaboradores } from '../services/colaboradorService';
import { getFolhaPonto, saveFolhaPonto } from '../services/folhaPontoService';
import { useAuth } from '../contexts/AuthContext';
import { calculateDailyTotal, calculateWorkedMinutes, getMonthName, minutesToTime, timeToMinutes } from '../utils/timeUtils';

interface TimesheetPageProps {
  adminView?: boolean;
}

const TimesheetPage: React.FC<TimesheetPageProps> = ({ adminView }) => {
  const { user } = useAuth();

  // Selection State
  const [selectedColabId, setSelectedColabId] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  // Data State
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [folha, setFolha] = useState<FolhaPonto | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');

  // Initial Data Load
  useEffect(() => {
    const init = async () => {
      if (adminView) {
        const colabs = await getColaboradores();
        // Filtrar admin da lista de colaboradores
        const colaboradoresFiltrados = colabs.filter(c => c.login !== 'admin');
        setColaboradores(colaboradoresFiltrados);
        if (colaboradoresFiltrados.length > 0) setSelectedColabId(colaboradoresFiltrados[0].id);
      } else if (user) {
        setSelectedColabId(user.id);
      }
    };
    init();
  }, [adminView, user]);

  // Fetch Folha when selections change
  useEffect(() => {
    const fetchFolha = async () => {
      if (!selectedColabId) return;
      setLoading(true);
      try {
        const data = await getFolhaPonto(selectedColabId, selectedMonth, selectedYear);
        setFolha(data);
      } catch (e) {
        console.error("Erro ao buscar folha", e);
      } finally {
        setLoading(false);
      }
    };
    fetchFolha();
  }, [selectedColabId, selectedMonth, selectedYear]);

  // Calculations for Header
  const totals = useMemo(() => {
    if (!folha) return { normal: 0, extra: 0, total: 0 };
    let normalMinutes = 0;
    let extraMinutes = 0;

    folha.dias.forEach(d => {
      normalMinutes += calculateDailyTotal(d.entrada1, d.saida1, d.entrada2, d.saida2);
      extraMinutes += calculateDailyTotal(d.extraEntrada1, d.extraSaida1, d.extraEntrada2, d.extraSaida2);
    });

    return {
      normal: minutesToTime(normalMinutes),
      extra: minutesToTime(extraMinutes),
      total: minutesToTime(normalMinutes + extraMinutes)
    };
  }, [folha]);


  // Handlers
  const handleDayChange = (index: number, field: keyof PontoDia, value: string) => {
    if (!folha || folha.statusPagamento === 'pago') return;
    const newDias = [...folha.dias];
    newDias[index] = { ...newDias[index], [field]: value };
    setFolha({ ...folha, dias: newDias });
  };

  const handleSave = async () => {
    if (!folha || folha.statusPagamento === 'pago') return;
    setSaving(true);
    setFeedback('');
    try {
      await saveFolhaPonto(folha);
      setFeedback('Salvo com sucesso!');
      setTimeout(() => setFeedback(''), 3000);
    } catch (e) {
      setFeedback('Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  if (!selectedColabId && adminView && !loading) return <div className="p-8 text-center text-slate-500">Nenhum colaborador disponível.</div>;

  const isLocked = folha?.statusPagamento === 'pago';

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 bg-surface p-6 rounded-xl border border-slate-700">
        <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
          {adminView && (
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400">Colaborador</label>
              <select
                className="bg-background border border-slate-600 text-white rounded p-2 outline-none focus:border-primary"
                value={selectedColabId}
                onChange={(e) => setSelectedColabId(e.target.value)}
              >
                {colaboradores.map(c => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">Mês</label>
            <select
              className="bg-background border border-slate-600 text-white rounded p-2 outline-none focus:border-primary"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>{getMonthName(i + 1)}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">Ano</label>
            <select
              className="bg-background border border-slate-600 text-white rounded p-2 outline-none focus:border-primary"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
            >
              <option value={2026}>2026</option>
              <option value={2027}>2027</option>
              <option value={2028}>2028</option>
            </select>
          </div>
        </div>

        {/* Totals Display */}
        <div className="flex gap-4 sm:gap-8 text-sm">
          <div className="text-center">
            <div className="text-slate-400 text-xs uppercase tracking-wider">Normais</div>
            <div className="text-xl font-bold text-slate-200">{totals.normal}h</div>
          </div>
          <div className="text-center">
            <div className="text-slate-400 text-xs uppercase tracking-wider">Extras</div>
            <div className="text-xl font-bold text-accent">{totals.extra}h</div>
          </div>
          <div className="text-center">
            <div className="text-slate-400 text-xs uppercase tracking-wider">Total</div>
            <div className="text-2xl font-bold text-primary">{totals.total}h</div>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="relative">
        {loading ? (
          <div className="text-center py-20 text-slate-500">Carregando folha...</div>
        ) : (
          <div className={`bg-surface rounded-xl border ${isLocked ? 'border-green-500/30' : 'border-slate-700'} overflow-hidden shadow-xl transition-colors`}>
            {/* Sticky Action Bar */}
            <div className="sticky top-0 z-10 bg-surface/95 backdrop-blur border-b border-slate-700 p-4 flex justify-between items-center">
              <h3 className="font-semibold text-slate-300 flex items-center gap-3">
                Folha de {getMonthName(selectedMonth)}/{selectedYear}
                {isLocked && (
                  <span className="bg-green-500/10 text-green-400 text-xs px-2 py-1 rounded border border-green-500/20 font-bold uppercase tracking-wider flex items-center gap-1">
                    🔒 Mês Fechado
                  </span>
                )}
                {feedback && <span className="ml-4 text-sm font-normal text-green-400 animate-pulse">{feedback}</span>}
              </h3>
              <button
                onClick={handleSave}
                disabled={saving || isLocked}
                className={`px-6 py-2 rounded font-semibold text-white transition-colors ${isLocked
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : saving
                    ? 'bg-slate-600'
                    : 'bg-primary hover:bg-blue-600'
                  }`}
              >
                {isLocked ? 'Pagamento Realizado' : saving ? 'Salvando...' : 'Salvar Folha'}
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-center">
                <thead>
                  <tr className="bg-slate-900/80 text-xs text-slate-400 uppercase font-semibold">
                    <th className="p-3 sticky left-0 bg-slate-900 z-10 border-r border-slate-700">Data</th>

                    <th className="p-3 border-l border-slate-700 bg-slate-800/30">Entrada</th>
                    <th className="p-3 bg-slate-800/30">Almoço Ini</th>
                    <th className="p-3 bg-slate-800/30">Almoço Fim</th>
                    <th className="p-3 bg-slate-800/30">Saída</th>
                    <th className="p-3 bg-slate-800/50 text-slate-200">Total</th>

                    <th className="p-3 border-l border-slate-700 bg-slate-900/30">Extra Ini</th>
                    <th className="p-3 bg-slate-900/30">Intervalo Ini</th>
                    <th className="p-3 bg-slate-900/30">Intervalo Fim</th>
                    <th className="p-3 bg-slate-900/30">Extra Fim</th>
                    <th className="p-3 bg-slate-900/50 text-accent">Total Ex</th>

                    <th className="p-3 border-l border-slate-700 w-48">Observações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700 text-slate-300">
                  {folha?.dias.map((dia, index) => {
                    const normalTotal = calculateDailyTotal(dia.entrada1, dia.saida1, dia.entrada2, dia.saida2);
                    const extraTotal = calculateDailyTotal(dia.extraEntrada1, dia.extraSaida1, dia.extraEntrada2, dia.extraSaida2);

                    // Criar data local a partir do dataIso para evitar problemas de timezone
                    const [year, month, day] = dia.dataIso.split('-').map(Number);
                    const dateLocal = new Date(year, month - 1, day);
                    const isWeekend = dateLocal.getDay() === 0 || dateLocal.getDay() === 6;

                    return (
                      <tr key={dia.dia} className={`hover:bg-slate-700/20 transition-colors ${isWeekend ? 'bg-slate-900/30' : ''}`}>
                        <td className={`p-2 sticky left-0 z-10 border-r border-slate-700 font-medium ${isWeekend ? 'bg-slate-900 text-slate-500' : 'bg-surface text-slate-200'}`}>
                          <div className="flex flex-col">
                            <span className="text-lg leading-none">{dia.dia.toString().padStart(2, '0')}</span>
                            <span className="text-[10px] uppercase opacity-50">
                              {dateLocal.toLocaleDateString('pt-BR', { weekday: 'short' })}
                            </span>
                          </div>
                        </td>

                        {/* Normal Hours */}
                        <td className="p-1"><input disabled={isLocked} type="time" className={`time-input ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`} value={dia.entrada1} onChange={(e) => handleDayChange(index, 'entrada1', e.target.value)} /></td>
                        <td className="p-1"><input disabled={isLocked} type="time" className={`time-input ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`} value={dia.saida1} onChange={(e) => handleDayChange(index, 'saida1', e.target.value)} /></td>
                        <td className="p-1"><input disabled={isLocked} type="time" className={`time-input ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`} value={dia.entrada2} onChange={(e) => handleDayChange(index, 'entrada2', e.target.value)} /></td>
                        <td className="p-1"><input disabled={isLocked} type="time" className={`time-input ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`} value={dia.saida2} onChange={(e) => handleDayChange(index, 'saida2', e.target.value)} /></td>
                        <td className="p-2 font-mono font-bold bg-slate-800/20">{normalTotal > 0 ? minutesToTime(normalTotal) : ''}</td>

                        {/* Extra Hours */}
                        <td className="p-1 border-l border-slate-700"><input disabled={isLocked} type="time" className={`time-input text-accent ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`} value={dia.extraEntrada1} onChange={(e) => handleDayChange(index, 'extraEntrada1', e.target.value)} /></td>
                        <td className="p-1"><input disabled={isLocked} type="time" className={`time-input text-accent ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`} value={dia.extraSaida1} onChange={(e) => handleDayChange(index, 'extraSaida1', e.target.value)} /></td>
                        <td className="p-1"><input disabled={isLocked} type="time" className={`time-input text-accent ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`} value={dia.extraEntrada2} onChange={(e) => handleDayChange(index, 'extraEntrada2', e.target.value)} /></td>
                        <td className="p-1"><input disabled={isLocked} type="time" className={`time-input text-accent ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`} value={dia.extraSaida2} onChange={(e) => handleDayChange(index, 'extraSaida2', e.target.value)} /></td>
                        <td className="p-2 font-mono font-bold text-accent bg-slate-800/20">{extraTotal > 0 ? minutesToTime(extraTotal) : ''}</td>

                        {/* Obs */}
                        <td className="p-1 border-l border-slate-700">
                          <input
                            type="text"
                            disabled={isLocked}
                            className={`w-full bg-transparent text-xs text-slate-300 p-1 outline-none border-b border-transparent focus:border-slate-500 placeholder-slate-600 ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                            placeholder="Obs..."
                            value={dia.observacoes}
                            onChange={(e) => handleDayChange(index, 'observacoes', e.target.value)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <style>{`
              .time-input {
                background: transparent;
                border: 1px solid #334155;
                border-radius: 4px;
                color: white;
                font-size: 0.75rem;
                padding: 2px 4px;
                width: 100%;
                text-align: center;
                outline: none;
              }
              .time-input:focus {
                border-color: #3b82f6;
              }
            `}</style>
          </div>
        )}
      </div>
    </div>
  );
};

export default TimesheetPage;