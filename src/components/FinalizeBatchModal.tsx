/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, CheckCircle2, AlertCircle, FileCheck, Folder, 
  Sparkles, Loader2, DollarSign, MessageSquare, ExternalLink, ArrowRight 
} from 'lucide-react';
import { Project, Proof } from '../types';
import { getDriveFolderUrl, extractDriveFolderId } from '../lib/drive';

interface FinalizeBatchModalProps {
  project: Project;
  proofs: Proof[];
  accessToken: string | null;
  onClose: () => void;
  onFinalize: (finalNotes: string, onProgress: (done: number, total: number, fileName: string) => void) => Promise<{ successCount: number; driveCopied: boolean; error?: string }>;
  onViewSelectedAfterFinalize: () => void;
}

export default function FinalizeBatchModal({
  project,
  proofs,
  accessToken,
  onClose,
  onFinalize,
  onViewSelectedAfterFinalize
}: FinalizeBatchModalProps) {
  const [clientFinalNotes, setClientFinalNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progressText, setProgressText] = useState<string>('');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [isDone, setIsDone] = useState(false);
  const [resultSummary, setResultSummary] = useState<{ successCount: number; driveCopied: boolean; error?: string } | null>(null);

  const selectedProofs = proofs.filter(p => p.isSelected);
  const selectedCount = selectedProofs.length;
  const contractedCount = project.contractedCount || 10;
  const extraPhotoPrice = project.extraPhotoPrice !== undefined ? project.extraPhotoPrice : 75;
  const basePrice = project.priceEstimate || 0;

  const extraCount = Math.max(0, selectedCount - contractedCount);
  const extraCost = extraCount * extraPhotoPrice;
  const totalPrice = basePrice + extraCost;

  const selectedDriveFolderId = project.selectedDriveFolderId ? extractDriveFolderId(project.selectedDriveFolderId) : '';
  const selectedDriveFolderUrl = getDriveFolderUrl(selectedDriveFolderId);

  const handleConfirmSubmit = async () => {
    setIsSubmitting(true);
    setProgressText('Iniciando homologação da seleção...');
    setProgressPercent(10);

    try {
      const res = await onFinalize(clientFinalNotes, (done, total, fileName) => {
        const pct = total > 0 ? Math.round((done / total) * 90) + 10 : 50;
        setProgressPercent(pct);
        setProgressText(`Copiando para Google Drive (${done}/${total}): ${fileName}...`);
      });

      setResultSummary(res);
      setProgressPercent(100);
      setProgressText('Seleção homologada com sucesso!');
      setIsDone(true);
    } catch (err: any) {
      console.error('Finalize modal error:', err);
      setResultSummary({
        successCount: selectedCount,
        driveCopied: false,
        error: err?.message || 'Falha ao processar.'
      });
      setIsDone(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-xl bg-[#121212] border border-neutral-800 rounded-3xl overflow-hidden shadow-2xl relative"
      >
        {/* Header */}
        <div className="p-6 border-b border-neutral-900 bg-gradient-to-r from-[#E85E26]/10 to-transparent flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#E85E26]/10 text-[#E85E26] rounded-xl border border-[#E85E26]/20">
              <FileCheck className="w-5 h-5 text-[#E85E26]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                {isDone ? 'Lote Homologado com Sucesso!' : 'Finalizar Seleção de Fotos'}
              </h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                {project.projectName} • {project.clientName}
              </p>
            </div>
          </div>

          {!isSubmitting && (
            <button
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-white rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {isDone ? (
            /* Success State */
            <div className="space-y-6 text-center py-4">
              <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto text-emerald-400">
                <CheckCircle2 className="w-9 h-9 stroke-[2.2]" />
              </div>

              <div>
                <h3 className="text-xl font-bold text-white">Sua Escolha Foi Registrada!</h3>
                <p className="text-xs text-neutral-400 mt-1.5 max-w-md mx-auto leading-relaxed">
                  O fotógrafo Dilson Ferreira recebeu a notificação do seu lote com <strong className="text-white">{selectedCount} fotos</strong> aprovadas para o fluxo de pós-produção.
                </p>
              </div>

              {/* Status details card */}
              <div className="bg-[#181818] border border-neutral-800 rounded-2xl p-4 text-left space-y-3 font-mono text-xs">
                <div className="flex justify-between items-center text-neutral-300">
                  <span>Fotos Selecionadas:</span>
                  <strong className="text-white">{selectedCount} fotos</strong>
                </div>
                {extraCount > 0 && (
                  <div className="flex justify-between items-center text-[#ff7236]">
                    <span>Fotos Extras ({extraCount}x R$ {extraPhotoPrice}):</span>
                    <strong>+R$ {extraCost.toLocaleString('pt-BR')}</strong>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t border-neutral-800 font-bold text-sm">
                  <span className="text-neutral-200">Investimento Final:</span>
                  <span className="text-[#E85E26]">R$ {totalPrice.toLocaleString('pt-BR')}</span>
                </div>
                
                {resultSummary?.driveCopied && selectedDriveFolderUrl && (
                  <div className="pt-2 border-t border-neutral-800 flex items-center justify-between text-[11px] text-emerald-400">
                    <span>Google Drive:</span>
                    <a 
                      href={selectedDriveFolderUrl} 
                      target="_blank" 
                      rel="noreferrer"
                      className="underline flex items-center gap-1 hover:text-emerald-300"
                    >
                      Pasta 02 - SELECIONADAS <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onViewSelectedAfterFinalize();
                  }}
                  className="bg-[#E85E26] hover:bg-[#ff7236] text-white font-mono font-bold text-xs uppercase tracking-wider px-6 py-3.5 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Ver Minhas Fotos Selecionadas</span>
                </button>
              </div>
            </div>
          ) : isSubmitting ? (
            /* Submitting & Progress State */
            <div className="space-y-6 text-center py-8">
              <div className="w-14 h-14 bg-orange-500/10 border border-[#E85E26]/30 rounded-full flex items-center justify-center mx-auto text-[#E85E26]">
                <Loader2 className="w-7 h-7 animate-spin" />
              </div>

              <div className="space-y-2">
                <h3 className="text-base font-bold text-white font-mono">Processando Lote de Seleção...</h3>
                <p className="text-xs text-neutral-400 font-mono">{progressText}</p>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-neutral-900 h-2.5 rounded-full overflow-hidden border border-neutral-800">
                <div 
                  className="bg-[#E85E26] h-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <p className="text-[11px] text-neutral-500">
                Homologando escolhas no banco de dados e sincronizando arquivos no Google Drive.
              </p>
            </div>
          ) : (
            /* Confirmation Details & Breakdown */
            <div className="space-y-5">
              
              {/* Financial & Quota Summary Box */}
              <div className="bg-[#181818] border border-neutral-800 rounded-2xl p-4 space-y-3.5 font-sans">
                <div className="flex items-center justify-between pb-3 border-b border-neutral-850">
                  <span className="text-xs text-neutral-400">Total de fotos escolhidas:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-white font-mono">{selectedCount} fotos</span>
                    <span className="text-xs text-neutral-500 font-mono">/ {contractedCount} inclusas</span>
                  </div>
                </div>

                <div className="space-y-2 text-xs font-mono">
                  <div className="flex justify-between text-neutral-300">
                    <span>Pacote Base Contratado:</span>
                    <span>R$ {basePrice.toLocaleString('pt-BR')}</span>
                  </div>

                  {extraCount > 0 ? (
                    <div className="flex justify-between text-[#ff7236]">
                      <span>Fotos Extras ({extraCount} x R$ {extraPhotoPrice}):</span>
                      <span>+R$ {extraCost.toLocaleString('pt-BR')}</span>
                    </div>
                  ) : (
                    <div className="flex justify-between text-emerald-400">
                      <span>Fotos Extras ({extraCount}):</span>
                      <span>R$ 0,00 (dentro do pacote)</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-2.5 border-t border-neutral-850 text-sm font-bold">
                    <span className="text-neutral-200">Total Consolidado:</span>
                    <span className="text-[#E85E26] text-base">R$ {totalPrice.toLocaleString('pt-BR')}</span>
                  </div>
                </div>
              </div>

              {/* Google Drive Routing Info */}
              <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-4 flex items-start gap-3">
                <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl shrink-0 mt-0.5">
                  <Folder className="w-4 h-4" />
                </div>
                <div className="text-xs space-y-1">
                  <p className="font-bold text-neutral-200">Destino no Google Drive</p>
                  {selectedDriveFolderId ? (
                    <p className="text-neutral-400 text-[11px] leading-relaxed">
                      Ao finalizar, as <strong className="text-white">{selectedCount} fotos selecionadas</strong> serão copiadas da pasta <em>01 - PROVAS</em> diretamente para a pasta <em>02 - SELECIONADAS</em> (<code className="text-[#E85E26]">{selectedDriveFolderId}</code>).
                    </p>
                  ) : (
                    <p className="text-amber-400 text-[11px] leading-relaxed">
                      A seleção será registrada no sistema. O fotógrafo poderá direcionar os arquivos para o Drive a qualquer momento.
                    </p>
                  )}
                </div>
              </div>

              {/* Optional Retouching Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono uppercase tracking-wider text-neutral-300 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-amber-500" />
                  Observações Gerais para o Fotógrafo (Opcional)
                </label>
                <textarea
                  value={clientFinalNotes}
                  onChange={(e) => setClientFinalNotes(e.target.value)}
                  placeholder="Instruções gerais para pós-produção (ex: preferência por tons mais quentes, foco no olhar, etc.)..."
                  rows={3}
                  className="w-full bg-[#0d0d0d] text-xs text-neutral-200 border border-neutral-800 rounded-xl p-3 focus:outline-none focus:border-[#E85E26] resize-none font-sans"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-900">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 text-xs font-mono uppercase text-neutral-400 hover:text-white transition-colors"
                >
                  Continuar Escolhendo
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSubmit}
                  className="bg-[#E85E26] hover:bg-[#ff7236] text-white font-mono font-bold text-xs uppercase tracking-wider px-6 py-3 rounded-xl transition-all shadow-lg shadow-orange-950/30 flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  <FileCheck className="w-4 h-4" />
                  <span>Confirmar e Finalizar ({selectedCount})</span>
                </button>
              </div>

            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
