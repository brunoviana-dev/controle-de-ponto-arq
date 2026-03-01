import React, { useEffect, useState } from 'react';
import { Colaborador, ResumoPagamento, ContaPagar, ContaPagarPagamento } from '../../services/interfaces/types';
import { getColaboradores } from '../../services/colaboradorService';
import { getFolhaPonto, saveFolhaPonto } from '../../services/folhaPontoService';
import { calculateDailyTotal, formatCurrency, getMonthName } from '../../utils/timeUtils';
import { contasPagarService } from '../../services/contasPagarService';
import { formatDate } from '../../utils/formatters';

const ReportsPage: React.FC = () => {
  const [reportData, setReportData] = useState<ResumoPagamento[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);

  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState<ResumoPagamento | null>(null);

  const [contasPagar, setContasPagar] = useState<ContaPagar[]>([]);
  const [pagamentosContas, setPagamentosContas] = useState<ContaPagarPagamento[]>([]);
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [selectedConta, setSelectedConta] = useState<ContaPagar | null>(null);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentValue, setPaymentValue] = useState<number>(0);
  const [isSubmittingPay, setIsSubmittingPay] = useState(false);

  const generateReport = async () => {
    setLoading(true);

    // Cálculo do Mês de Referência (Mês Selecionado - 1)
    let mesReferencia = selectedMonth - 1;
    let anoReferencia = selectedYear;

    if (selectedMonth === 1) {
      mesReferencia = 12;
      anoReferencia = selectedYear - 1;
    }

    const colaboradores = await getColaboradores();

    // Filtrar admin da lista de colaboradores
    const colaboradoresFiltrados = colaboradores.filter(c => c.login !== 'admin');
    const results: ResumoPagamento[] = [];

    for (const colab of colaboradoresFiltrados) {
      const folha = await getFolhaPonto(colab.id, mesReferencia, anoReferencia);

      // Se já está pago, usar os snapshots
      if (folha.statusPagamento === 'pago') {
        results.push({
          colaboradorId: colab.id,
          colaboradorNome: colab.nome,
          mes: mesReferencia,
          ano: anoReferencia,
          totalHorasNormais: 0,
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
        let normalMinutes = 0;
        let extraMinutes = 0;

        folha.dias.forEach(d => {
          const normal = calculateDailyTotal(d.entrada1, d.saida1, d.entrada2, d.saida2);
          const extra = calculateDailyTotal(d.extraEntrada1, d.extraSaida1, d.extraEntrada2, d.extraSaida2);
          normalMinutes += normal;
          extraMinutes += extra;
        });

        const totalMinutes = normalMinutes + extraMinutes;
        const totalHours = totalMinutes / 60;
        const valorTotal = totalHours * colab.valorHora;
        const valorInss = colab.valorInssFixo || 0;
        const totalPagar = Math.max(0, valorTotal - valorInss);

        results.push({
          colaboradorId: colab.id,
          colaboradorNome: colab.nome,
          mes: mesReferencia,
          ano: anoReferencia,
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

    // Buscar contas a pagar e pagamentos do mês
    try {
      const [contas, pagamentos] = await Promise.all([
        contasPagarService.getContasPorMes(selectedMonth, selectedYear),
        contasPagarService.getPagamentosPorMes(selectedMonth, selectedYear)
      ]);
      setContasPagar(contas);
      setPagamentosContas(pagamentos);
    } catch (error) {
      console.error('Erro ao buscar contas a pagar:', error);
    }

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
      const folha = await getFolhaPonto(paymentTarget.colaboradorId, paymentTarget.mes, paymentTarget.ano);

      folha.statusPagamento = 'pago';
      folha.snapshotValorHora = paymentTarget.valorHora;
      folha.snapshotTotalHoras = paymentTarget.totalGeral;
      folha.valorTotalCalculado = paymentTarget.valorTotalCalculado;
      folha.valorInss = paymentTarget.valorInss;
      folha.valorPagoFinal = paymentTarget.totalPagar;

      await saveFolhaPonto(folha);

      setConfirmModalOpen(false);
      setPaymentTarget(null);
      await generateReport();
    } catch (error) {
      console.error("Erro ao processar pagamento:", error);
      alert("Erro ao processar pagamento.");
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleOpenPayModal = (conta: ContaPagar) => {
    setSelectedConta(conta);
    setPaymentValue(conta.valor);
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setPayModalOpen(true);
  };

  const handleValueChange = (val: string) => {
    // Remove tudo que não é dígito
    const cleanValue = val.replace(/\D/g, '');
    const numericValue = Number(cleanValue) / 100;
    setPaymentValue(numericValue);
  };

  const confirmContaPayment = async () => {
    if (!selectedConta) return;

    setIsSubmittingPay(true);
    try {
      await contasPagarService.registrarPagamento({
        conta_id: selectedConta.id,
        data_pagamento: paymentDate,
        valor_pago: paymentValue,
        mes_referencia: selectedMonth,
        ano_referencia: selectedYear
      });

      setPayModalOpen(false);
      setSelectedConta(null);
      await generateReport();
    } catch (error: any) {
      console.error("Erro ao registrar pagamento:", error);
      alert(error.message || "Erro ao registrar pagamento.");
    } finally {
      setIsSubmittingPay(false);
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
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reportData.length === 0 ? (
              <div className="col-span-full text-center text-slate-500 py-10">Nenhum dado encontrado para colaboradores.</div>
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

          <div className="pt-8 border-t border-slate-700">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-white">Contas a Pagar do Mês</h2>
              <p className="text-slate-400 text-sm">Registro de pagamentos fixos e variáveis.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3">
              {contasPagar.length === 0 ? (
                <div className="col-span-full text-center text-slate-500 py-10 bg-surface/50 rounded-xl border border-dashed border-slate-700">
                  Nenhuma conta cadastrada para este período.
                </div>
              ) : (
                contasPagar.map((conta) => {
                  const pagamento = pagamentosContas.find(p => p.conta_id === conta.id);

                  return (
                    <div key={conta.id} className={`bg-surface border ${pagamento ? 'border-emerald-500/50' : 'border-slate-700'} rounded-lg p-3.5 shadow-lg flex flex-col justify-between hover:border-slate-500 transition-colors relative`}>
                      {pagamento && (
                        <div className="absolute top-2 right-2 bg-emerald-500/10 text-emerald-400 text-[11px] px-1.5 py-0.5 rounded border border-emerald-500/20 font-bold uppercase tracking-wider">
                          Pago
                        </div>
                      )}

                      <div className="min-w-0">
                        <h3 className="text-base font-bold text-white mb-0.5 truncate pr-8" title={conta.descricao}>{conta.descricao}</h3>
                        <div className="text-xs text-slate-400 mb-2 border-b border-slate-700 pb-1">
                          <span className="text-slate-200">{conta.categoria || 'N/A'}</span>
                        </div>

                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between text-slate-400">
                            <span>Venc.:</span>
                            <span className="text-white font-mono">{formatDate(conta.data_vencimento)}</span>
                          </div>
                          <div className="flex justify-between text-slate-400">
                            <span>Valor:</span>
                            <span className="text-white font-medium">{formatCurrency(conta.valor)}</span>
                          </div>

                          {pagamento && (
                            <div className="mt-2 pt-2 border-t border-slate-700/50 space-y-1">
                              <div className="flex justify-between items-center">
                                <span className="text-slate-400">Pago:</span>
                                <span className="text-emerald-400">{formatDate(pagamento.data_pagamento)}</span>
                              </div>
                              <div className="flex justify-between items-center font-bold">
                                <span className="text-slate-400">Total:</span>
                                <span className="text-emerald-400">{formatCurrency(pagamento.valor_pago)}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {!pagamento && (
                        <div className="mt-3 pt-2 border-t border-slate-700">
                          <button
                            onClick={() => handleOpenPayModal(conta)}
                            className="w-full py-2 rounded text-sm font-bold bg-primary hover:bg-blue-600 text-white shadow-lg shadow-blue-900/20 transition-all font-mono"
                          >
                            Pagar
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}

      {/* Modal Pagamento Colaborador */}
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

      {/* Modal Pagamento Conta a Pagar */}
      {payModalOpen && selectedConta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-surface border border-slate-600 rounded-xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-white mb-2">Registrar Pagamento</h3>
            <p className="text-slate-300 mb-6 font-medium">
              {selectedConta.descricao}
            </p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Data do Pagamento</label>
                <input
                  type="date"
                  className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white focus:border-primary outline-none"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Valor Pago</label>
                <input
                  type="text"
                  className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white focus:border-primary outline-none font-mono"
                  value={formatCurrency(paymentValue)}
                  onChange={(e) => handleValueChange(e.target.value)}
                />
              </div>

              <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded text-xs text-blue-400">
                O pagamento será registrado para o mês de referência <span className="font-bold underline">{getMonthName(selectedMonth)}/{selectedYear}</span>.
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setPayModalOpen(false)}
                className="px-4 py-2 rounded text-slate-300 hover:bg-slate-800 transition-colors"
                disabled={isSubmittingPay}
              >
                Cancelar
              </button>
              <button
                onClick={confirmContaPayment}
                disabled={isSubmittingPay}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded font-bold shadow-lg shadow-emerald-900/20 disabled:opacity-70 flex items-center gap-2"
              >
                {isSubmittingPay && <span className="animate-spin text-white">⌛</span>}
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