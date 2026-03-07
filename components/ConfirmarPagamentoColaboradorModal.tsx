import React, { useState } from 'react';
import { ResumoPagamento } from '../services/interfaces/types';
import { formatCurrency } from '../utils/timeUtils';
import { getFolhaPonto, saveFolhaPonto } from '../services/folhaPontoService';
import { supabase } from '../services/supabaseClient';

interface ConfirmarPagamentoColaboradorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    paymentTarget: ResumoPagamento | null;
}

const ConfirmarPagamentoColaboradorModal: React.FC<ConfirmarPagamentoColaboradorModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    paymentTarget
}) => {
    const [comprovanteFile, setComprovanteFile] = useState<File | null>(null);
    const [processing, setProcessing] = useState(false);
    const [uploading, setUploading] = useState(false);

    if (!isOpen || !paymentTarget) return null;

    const confirmPayment = async () => {
        setProcessing(true);
        try {
            const folha = await getFolhaPonto(paymentTarget.colaboradorId, paymentTarget.mes, paymentTarget.ano);

            folha.statusPagamento = 'pago';
            folha.snapshotValorHora = paymentTarget.valorHora;
            folha.snapshotTotalHoras = paymentTarget.totalGeral;
            folha.valorTotalCalculado = paymentTarget.valorTotalCalculado;
            folha.valorInss = paymentTarget.valorInss;
            folha.valorPagoFinal = paymentTarget.totalPagar;

            if (comprovanteFile) {
                setUploading(true);
                try {
                    const fileExt = comprovanteFile.name.split('.').pop();
                    const fileName = `${paymentTarget.colaboradorId}_${paymentTarget.ano}_${paymentTarget.mes}_${Date.now()}.${fileExt}`;
                    const filePath = `comprovantes/${fileName}`;

                    const { error: uploadError } = await supabase.storage
                        .from('folhas-ponto-comprovantes')
                        .upload(filePath, comprovanteFile);

                    if (uploadError) throw uploadError;
                    folha.comprovanteUrl = filePath;
                } catch (uploadErr) {
                    console.error("Erro no upload do comprovante:", uploadErr);
                    alert("Aviso: O pagamento será registrado, mas houve um erro ao salvar o arquivo.");
                } finally {
                    setUploading(false);
                }
            }

            await saveFolhaPonto(folha);
            onSuccess();
            onClose();
        } catch (error) {
            console.error("Erro ao processar pagamento:", error);
            alert("Erro ao processar pagamento.");
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-surface border border-slate-600 rounded-xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
                <h3 className="text-xl font-bold text-white mb-2">Confirmar Pagamento</h3>
                <p className="text-slate-300 mb-6 text-sm">
                    Deseja confirmar o pagamento para <span className="text-primary font-bold">{paymentTarget.colaboradorNome}</span>?
                    <br /><br />
                    <span className="text-red-400 text-xs block bg-red-400/10 p-2 rounded border border-red-400/20">
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

                <div className="mb-6">
                    <label className="block text-sm font-medium text-slate-400 mb-2">
                        Anexo de Comprovante <span className="text-xs font-normal text-slate-500">(Opcional)</span>
                    </label>
                    <div className="flex items-center justify-center w-full">
                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-700 border-dashed rounded-lg cursor-pointer bg-slate-800/50 hover:bg-slate-800 transition-colors">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <svg className="w-8 h-8 mb-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                                <p className="mb-2 text-sm text-slate-400 text-center px-4">
                                    <span className="font-semibold">{comprovanteFile ? comprovanteFile.name : 'Clique para anexar'}</span>
                                </p>
                                <p className="text-xs text-slate-500">PDF, JPG ou PNG</p>
                            </div>
                            <input
                                type="file"
                                className="hidden"
                                accept=".pdf,image/*"
                                onChange={(e) => setComprovanteFile(e.target.files?.[0] || null)}
                            />
                        </label>
                    </div>
                </div>

                <div className="flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded text-slate-300 hover:bg-slate-800 transition-colors"
                        disabled={processing}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={confirmPayment}
                        disabled={processing}
                        className="px-4 py-2 bg-primary hover:bg-blue-600 text-white rounded font-bold shadow-lg shadow-blue-900/20 disabled:opacity-70 flex items-center gap-2"
                    >
                        {(processing || uploading) && <span className="animate-spin text-white">⌛</span>}
                        {uploading ? 'Enviando Arquivo...' : 'Confirmar Pagamento'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmarPagamentoColaboradorModal;
