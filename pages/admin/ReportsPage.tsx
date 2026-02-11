import React, { useEffect, useState } from 'react';
import { Colaborador, ResumoPagamento } from '../../services/interfaces/types';
import { getColaboradores } from '../../services/colaboradorService';
import { getFolhaPonto, saveFolhaPonto } from '../../services/folhaPontoService';
import { calculateDailyTotal, formatCurrency, getMonthName } from '../../utils/timeUtils';

const ReportsPage: React.FC = () => {
  const [reportData, setReportData] = useState<ResumoPagamento[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);

  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState<ResumoPagamento | null>(null);

  const generateReport = async () => {
    setLoading(true);
    const colaboradores = await getColaboradores();

    // Filtrar admin da lista de colaboradores
    const colaboradoresFiltrados = colaboradores.filter(c => c.login !== 'admin');
    const results: ResumoPagamento[] = [];

    for (const colab of colaboradoresFiltrados) {
      const folha = await getFolhaPonto(colab.id, selectedMonth, selectedYear);

      // Se já está pago, usar os snapshots
      if (folha.statusPagamento === 'pago') {
        results.push({
          colaboradorId: colab.id,
          colaboradorNome: colab.nome,
          mes: selectedMonth,
          ano: selectedYear,
          totalHorasNormais: 0, // Não relevante para exibição financeira congelada, mas mantemos
          totalHorasExtras: 0,
          totalGeral: folha.snapshotTotalHoras || 0,
          valorHora: folha.snapshotValorHora || colab.valorHora,
          totalPagar: folha.valorPagoFinal || 0,
          valorTotalCalculado: folha.valorTotalCalculado,
          valorInss: folha.valorInss,
          statusPagamento: 'pago'
        });
      } else {
        // Se pendente, calcular realtime
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
        const valorTotal = totalHours * colab.valorHora;
        const valorInss = colab.valorInssFixo || 0;
        const totalPagar = Math.max(0, valorTotal - valorInss);

        results.push({
          colaboradorId: colab.id,
          colaboradorNome: colab.nome,
          mes: selectedMonth,
          ano: selectedYear,
          totalHorasNormais: normalMinutes,
          totalHorasExtras: extraMinutes,
          totalGeral: totalMinutes,
          valorHora: colab.valorHora,
          valorTotalCalculado: valorTotal,
          valorInss: valorInss,
          totalPagar: totalPagar,
          statusPagamento: 'pendente'
        });
      }
    }

    setReportData(results);
    setLoading(false);
  };

  useEffect(() => {
    generateReport();
  }, [selectedMonth, selectedYear]);

  const handleOpenPaymentModal = (item: ResumoPagamento) => {
    setPaymentTarget(item);
    setConfirmModalOpen(true);
  };

  const confirmPayment = async () => {
    if (!paymentTarget) return;

    setProcessingPayment(true);
    try {
      // Recuperar a folha atual para garantir integridade
      const folha = await getFolhaPonto(paymentTarget.colaboradorId, selectedMonth, selectedYear);

      // Atualizar folha com dados de fechamento
      folha.statusPagamento = 'pago';
      folha.snapshotValorHora = paymentTarget.valorHora;
      folha.snapshotTotalHoras = paymentTarget.totalGeral;
      folha.valorTotalCalculado = paymentTarget.valorTotalCalculado;
      folha.valorInss = paymentTarget.valorInss;
      folha.valorPagoFinal = paymentTarget.totalPagar;

      await saveFolhaPonto(folha);

      setConfirmModalOpen(false);
      setPaymentTarget(null);
      await generateReport(); // Recarregar dados
    } catch (error) {
      console.error("Erro ao processar pagamento:", error);
      alert("Erro ao processar pagamento.");
    } finally {
      setProcessingPayment(false);
    }
  };

  return (
    <div className="space-y-6 relative">
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
            {Array.from({ length: 5 }, (_, i) => {
              const year = 2024 + i;
              return <option key={year} value={year}>{year}</option>;
            })}
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
              <div key={item.colaboradorId} className={`bg-surface border ${item.statusPagamento === 'pago' ? 'border-green-500/50' : 'border-slate-700'} rounded-xl p-6 shadow-lg flex flex-col justify-between hover:border-slate-500 transition-colors relative`}>

                {item.statusPagamento === 'pago' && (
                  <div className="absolute top-4 right-4 bg-green-500/10 text-green-400 text-xs px-2 py-1 rounded border border-green-500/20 font-bold uppercase tracking-wider">
                    Pago
                  </div>
                )}

                <div>
                  <h3 className="text-lg font-bold text-white mb-1">{item.colaboradorNome}</h3>
                  <div className="text-sm text-slate-400 mb-4 border-b border-slate-700 pb-2">
                    Valor Hora: <span className="text-slate-200">{formatCurrency(item.valorHora)}</span>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-slate-400">
                      <span>Total Horas:</span>
                      <span className="text-white font-mono">{(item.totalGeral / 60).toFixed(2)}h</span>
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-700/50 space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-400">Valor Total:</span>
                        <span className="text-slate-200 font-medium">{formatCurrency(item.valorTotalCalculado || 0)}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm text-red-400">
                        <span>Valor INSS:</span>
                        <span className="font-medium">- {formatCurrency(item.valorInss || 0)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-700">
                  <div className="flex justify-between items-end mb-4">
                    <span className="text-sm font-medium text-slate-400">Total a Pagar</span>
                    <span className="text-2xl font-bold text-primary">{formatCurrency(item.totalPagar)}</span>
                  </div>

                  <button
                    onClick={() => handleOpenPaymentModal(item)}
                    disabled={item.statusPagamento === 'pago'}
                    className={`w-full py-2 rounded font-bold transition-all ${item.statusPagamento === 'pago'
                      ? 'bg-slate-700 text-slate-500 cursor-not-allowed opacity-50'
                      : 'bg-primary hover:bg-blue-600 text-white shadow-lg shadow-blue-900/20'
                      }`}
                  >
                    {item.statusPagamento === 'pago' ? 'Mês Fechado' : 'Pagar e Bloquear'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModalOpen && paymentTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-surface border border-slate-600 rounded-xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-white mb-2">Confirmar Pagamento</h3>
            <p className="text-slate-300 mb-6">
              Deseja confirmar o pagamento para <span className="text-primary font-bold">{paymentTarget.colaboradorNome}</span>?
              <br /><br />
              <span className="text-red-400 text-sm block bg-red-400/10 p-2 rounded border border-red-400/20">
                ⚠️ Esta ação irá bloquear edições nesta folha de ponto e congelar os valores.
              </span>
            </p>

            <div className="space-y-2 mb-6 bg-slate-900/50 p-4 rounded text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Valor Total:</span>
                <span className="text-slate-200">{formatCurrency(paymentTarget.valorTotalCalculado || 0)}</span>
              </div>
              <div className="flex justify-between text-red-400">
                <span>Desconto INSS:</span>
                <span>- {formatCurrency(paymentTarget.valorInss || 0)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-700 pt-2 mt-2 font-bold text-lg">
                <span className="text-white">Total Final:</span>
                <span className="text-primary">{formatCurrency(paymentTarget.totalPagar)}</span>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmModalOpen(false)}
                className="px-4 py-2 rounded text-slate-300 hover:bg-slate-800 transition-colors"
                disabled={processingPayment}
              >
                Cancelar
              </button>
              <button
                onClick={confirmPayment}
                disabled={processingPayment}
                className="px-4 py-2 bg-primary hover:bg-blue-600 text-white rounded font-bold shadow-lg shadow-blue-900/20 disabled:opacity-70 flex items-center gap-2"
              >
                {processingPayment && <span className="animate-spin text-white">⌛</span>}
                Confirmar Pagamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsPage;
