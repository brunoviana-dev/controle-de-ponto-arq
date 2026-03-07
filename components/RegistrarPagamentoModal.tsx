import React, { useState, useEffect } from 'react';
import { ContaPagar } from '../services/interfaces/types';
import { getMonthName, formatCurrency } from '../utils/timeUtils';
import { contasPagarService } from '../services/contasPagarService';

interface RegistrarPagamentoModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    conta: ContaPagar | null;
    mesReferencia: number;
    anoReferencia: number;
}

const RegistrarPagamentoModal: React.FC<RegistrarPagamentoModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    conta,
    mesReferencia,
    anoReferencia
}) => {
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [paymentValue, setPaymentValue] = useState<number>(0);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (conta) {
            setPaymentValue(conta.valor);
            setPaymentDate(new Date().toISOString().split('T')[0]);
        }
    }, [conta]);

    if (!isOpen || !conta) return null;

    const handleValueChange = (val: string) => {
        // Remove everything that isn't a digit
        const cleanValue = val.replace(/\D/g, '');
        const numericValue = Number(cleanValue) / 100;
        setPaymentValue(numericValue);
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            await contasPagarService.registrarPagamento({
                conta_id: conta.id,
                data_pagamento: paymentDate,
                valor_pago: paymentValue,
                mes_referencia: mesReferencia,
                ano_referencia: anoReferencia
            });
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error("Erro ao registrar pagamento:", error);
            alert(error.message || "Erro ao registrar pagamento.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-surface border border-slate-600 rounded-xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
                <h3 className="text-xl font-bold text-white mb-2">Registrar Pagamento</h3>
                <p className="text-slate-300 mb-6 font-medium">
                    {conta.descricao}
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
                        O pagamento será registrado para o mês de referência <span className="font-bold underline">{getMonthName(mesReferencia)}/{anoReferencia}</span>.
                    </div>
                </div>

                <div className="flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded text-slate-300 hover:bg-slate-800 transition-colors"
                        disabled={isSubmitting}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded font-bold shadow-lg shadow-emerald-900/20 disabled:opacity-70 flex items-center gap-2"
                    >
                        {isSubmitting && <span className="animate-spin text-white">⌛</span>}
                        Confirmar Pagamento
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RegistrarPagamentoModal;
