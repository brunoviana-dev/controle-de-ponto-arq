import React, { useEffect, useState } from 'react';
import { Colaborador, ResumoPagamento } from '../../services/interfaces/types';
import { getColaboradores } from '../../services/colaboradorService';
import { getFolhaPonto } from '../../services/folhaPontoService';
import { calculateDailyTotal, formatCurrency, getMonthName } from '../../utils/timeUtils';

const ReportsPage: React.FC = () => {
  const [reportData, setReportData] = useState<ResumoPagamento[]>([]);
  const [loading, setLoading] = useState(false);

  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  useEffect(() => {
    const generateReport = async () => {
      setLoading(true);
      const colaboradores = await getColaboradores();

      // Filtrar admin da lista de colaboradores
      const colaboradoresFiltrados = colaboradores.filter(c => c.login !== 'admin');
      const results: ResumoPagamento[] = [];

      for (const colab of colaboradoresFiltrados) {
        const folha = await getFolhaPonto(colab.id, selectedMonth, selectedYear);

        let totalMinutes = 0;
        let normalMinutes = 0;
        let extraMinutes = 0;

        folha.dias.forEach(d => {
          const normal = calculateDailyTotal(d.entrada1, d.saida1, d.entrada2, d.saida2);
          const extra = calculateDailyTotal(d.extraEntrada1, d.extraSaida1, d.extraEntrada2, d.extraSaida2);
          normalMinutes += normal;
          extraMinutes += extra;
        });

        totalMinutes = normalMinutes + extraMinutes;
        const totalHours = totalMinutes / 60;

        results.push({
          colaboradorId: colab.id,
          colaboradorNome: colab.nome,
          mes: selectedMonth,
          ano: selectedYear,
          totalHorasNormais: normalMinutes,
          totalHorasExtras: extraMinutes,
          totalGeral: totalMinutes,
          valorHora: colab.valorHora,
          totalPagar: totalHours * colab.valorHora
        });
      }

      setReportData(results);
      setLoading(false);
    };

    generateReport();
  }, [selectedMonth, selectedYear]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Relatório de Pagamento</h2>
          <p className="text-slate-400 text-sm">Resumo financeiro mensal por colaborador.</p>
        </div>

        <div className="flex gap-2">
          <select
            className="bg-surface border border-slate-600 text-white rounded p-2 outline-none focus:border-primary"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>{getMonthName(i + 1)}</option>
            ))}
          </select>
          <select
            className="bg-surface border border-slate-600 text-white rounded p-2 outline-none focus:border-primary"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
          >
            <option value={2026}>2026</option>
            <option value={2027}>2027</option>
            <option value={2028}>2028</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-slate-500">Calculando...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reportData.length === 0 ? (
            <div className="col-span-full text-center text-slate-500 py-10">Nenhum dado encontrado.</div>
          ) : (
            reportData.map((item) => (
              <div key={item.colaboradorId} className="bg-surface border border-slate-700 rounded-xl p-6 shadow-lg flex flex-col justify-between hover:border-slate-500 transition-colors">
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">{item.colaboradorNome}</h3>
                  <div className="text-sm text-slate-400 mb-4 border-b border-slate-700 pb-2">
                    Valor Hora: <span className="text-slate-200">{formatCurrency(item.valorHora)}</span>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Horas Normais:</span>
                      <span className="text-slate-200 font-mono">{(item.totalHorasNormais / 60).toFixed(2)}h</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Horas Extras:</span>
                      <span className="text-accent font-mono">{(item.totalHorasExtras / 60).toFixed(2)}h</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-slate-700/50">
                      <span className="text-slate-300 font-medium">Total Horas:</span>
                      <span className="text-white font-mono font-bold">{(item.totalGeral / 60).toFixed(2)}h</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-700">
                  <div className="flex justify-between items-end">
                    <span className="text-sm font-medium text-slate-400">Total a Pagar</span>
                    <span className="text-2xl font-bold text-primary">{formatCurrency(item.totalPagar)}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default ReportsPage;