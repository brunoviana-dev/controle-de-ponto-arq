import React, { useEffect, useState } from 'react';
import { Colaborador, ResumoPagamento, ContaPagar, ContaPagarPagamento } from '../../services/interfaces/types';
import { getColaboradores } from '../../services/colaboradorService';
import { getFolhaPonto, saveFolhaPonto } from '../../services/folhaPontoService';
import { calculateDailyTotal, formatCurrency, getMonthName } from '../../utils/timeUtils';
import { contasPagarService } from '../../services/contasPagarService';
import { formatDate } from '../../utils/formatters';
import RegistrarPagamentoModal from '../../components/RegistrarPagamentoModal';
import ConfirmarPagamentoColaboradorModal from '../../components/ConfirmarPagamentoColaboradorModal';

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
  const [comprovanteFile, setComprovanteFile] = useState<File | null>(null);

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
    const colaboradoresFiltrados = colaboradores.filter(c => c.perfil !== 'admin');
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
          statusPagamento: 'pago',
          comprovanteUrl: folha.comprovanteUrl
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

  const handleDownloadComprovante = async (path: string) => {
    try {
      const { data, error } = await (await import('../../services/supabaseClient')).supabase.storage
        .from('folhas-ponto-comprovantes')
        .createSignedUrl(path, 60 * 60); // Válido por 1 hora

      if (error) {
        throw error;
      }

      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      } else {
        alert("Não foi possível gerar o link do comprovante.");
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao abrir comprovante.");
    }
  };

  const handleOpenPayModal = (conta: ContaPagar) => {
    setSelectedConta(conta);
    setPayModalOpen(true);
  };

  const totalFolhaPrevisto = reportData.reduce((acc, r) => acc + r.totalPagar, 0);
  const totalFolhaPago = reportData.filter(r => r.statusPagamento === 'pago').reduce((acc, r) => acc + r.totalPagar, 0);

  const totalContasPrevisto = contasPagar.reduce((acc, c) => acc + c.valor, 0);
  const totalContasPago = pagamentosContas.reduce((acc, p) => acc + p.valor_pago, 0);

  const totalGeralPrevisto = totalFolhaPrevisto + totalContasPrevisto;
  const totalGeralPago = totalFolhaPago + totalContasPago;
  const totalGeralAPagar = totalGeralPrevisto - totalGeralPago;

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

      {!loading && (
        <div className="bg-slate-800/80 border border-slate-700/50 rounded-xl p-4 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-primary to-emerald-500"></div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 divide-y md:divide-y-0 md:divide-x divide-slate-700">
            {/* Total Previsto */}
            <div className="flex flex-col items-center justify-center">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-0.5">Total Previsto</span>
              <span className="text-2xl font-bold text-white tracking-tight">{formatCurrency(totalGeralPrevisto)}</span>
            </div>

            {/* Total Pago */}
            <div className="flex flex-col items-center justify-center pt-3 md:pt-0">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-0.5">Total Pago</span>
              <span className="text-2xl font-bold text-emerald-400 tracking-tight">{formatCurrency(totalGeralPago)}</span>
            </div>

            {/* Total A Pagar */}
            <div className="flex flex-col items-center justify-center pt-3 md:pt-0">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-0.5">Total a Pagar</span>
              <span className="text-2xl font-bold text-rose-400 tracking-tight">{formatCurrency(Math.max(0, totalGeralAPagar))}</span>
            </div>
          </div>
        </div>
      )}

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

                    {item.statusPagamento === 'pendente' ? (
                      <button
                        onClick={() => handleOpenPaymentModal(item)}
                        className="w-full py-2 rounded font-bold transition-all bg-primary hover:bg-blue-600 text-white shadow-lg shadow-blue-900/20"
                      >
                        Pagar e Bloquear
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <div className="flex-1 py-2 text-center rounded font-bold bg-slate-700 text-slate-500 opacity-50 cursor-not-allowed">
                          Mês Fechado
                        </div>
                        {item.comprovanteUrl && (
                          <button
                            onClick={() => handleDownloadComprovante(item.comprovanteUrl!)}
                            className="px-3 py-2 rounded font-bold bg-slate-800 text-blue-400 hover:bg-slate-700 hover:text-blue-300 transition-colors border border-slate-600 shadow-sm flex items-center justify-center"
                            title="Ver Comprovante"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                            </svg>
                          </button>
                        )}
                      </div>
                    )}
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

      {/* Modal Pagamento Colaborador Reutilizável */}
      <ConfirmarPagamentoColaboradorModal
        isOpen={confirmModalOpen}
        paymentTarget={paymentTarget}
        onClose={() => {
          setConfirmModalOpen(false);
          setPaymentTarget(null);
        }}
        onSuccess={generateReport}
      />

      {/* Modal Pagamento Conta a Pagar Reutilizável */}
      <RegistrarPagamentoModal
        isOpen={payModalOpen}
        conta={selectedConta}
        mesReferencia={selectedMonth}
        anoReferencia={selectedYear}
        onClose={() => {
          setPayModalOpen(false);
          setSelectedConta(null);
        }}
        onSuccess={generateReport}
      />
    </div>
  );
};

export default ReportsPage;