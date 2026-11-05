/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  X, Check, EyeOff, MessageSquare, ChevronLeft, ChevronRight, 
  Square, CheckSquare, Sparkles, Gift 
} from 'lucide-react';
import { Proof } from '../types';

interface ZoomProofModalProps {
  proof: Proof;
  onClose: () => void;
  onToggleSelect: (id: string) => void;
  onUpdateNotes: (id: string, notes: string) => void;
  onNext?: () => void;
  onPrev?: () => void;
  statusLock: boolean;
  isAdmin?: boolean;
  onToggleBonus?: (id: string) => void;
}

export default function ZoomProofModal({ 
  proof, 
  onClose, 
  onToggleSelect, 
  onUpdateNotes, 
  onNext, 
  onPrev,
  statusLock,
  isAdmin = false,
  onToggleBonus
}: ZoomProofModalProps) {
  const [note, setNote] = useState(proof.clientNotes || '');

  // Photographer (admin) is never locked out
  const effectiveLock = isAdmin ? false : statusLock;

  // Keep state sync'd when moving next/prev
  useEffect(() => {
    setNote(proof.clientNotes || '');
  }, [proof]);

  const handleBlurSave = () => {
    onUpdateNotes(proof.id, note);
  };

  const defaultBonusMessage = "Essa eu curti demais e não poderia ficar de fora do projeto! 🎁";

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-50 flex flex-col md:flex-row items-stretch justify-between">
      {/* Visual Workspace Area (takes 70% space on big screen) */}
      <div className="flex-1 min-h-0 bg-[#070707] flex flex-col relative items-center justify-center p-4">
        {/* Top Control strip */}
        <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-2">
            <div className="bg-[#121212]/90 border border-neutral-800/80 rounded-full px-4 py-1.5 backdrop-blur-md flex items-center gap-2 pointer-events-auto">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-mono text-neutral-300 font-medium">
                {proof.name}
              </span>
            </div>

            {proof.isBonus && (
              <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-black font-bold font-mono text-xs rounded-full px-3 py-1 flex items-center gap-1.5 shadow-lg pointer-events-auto">
                <Gift className="w-3.5 h-3.5" />
                <span>Foto Brinde Especial</span>
              </div>
            )}
          </div>

          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-[#121212]/90 hover:bg-neutral-800 text-neutral-400 hover:text-white flex items-center justify-center border border-neutral-800/80 transition-colors pointer-events-auto shadow-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Master Image Frame */}
        <div className="relative w-full max-w-4xl max-h-[75vh] md:max-h-[85vh] aspect-[3/4] flex items-center justify-center">
          <img 
            src={proof.fullUrl} 
            alt={proof.name} 
            referrerPolicy="no-referrer"
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl select-none transition-all duration-300 border border-neutral-900"
            onError={(e) => {
              (e.target as HTMLImageElement).src = proof.thumbnailUrl || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=1200';
            }}
          />
        </div>

        {/* Direction arrows */}
        {onPrev && (
          <button 
            onClick={onPrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/55 hover:bg-amber-500 hover:text-black border border-white/5 flex items-center justify-center transition-all stroke-[2.5] cursor-pointer"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}
        
        {onNext && (
          <button 
            onClick={onNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/55 hover:bg-amber-500 hover:text-black border border-white/5 flex items-center justify-center transition-all stroke-[2.5] cursor-pointer"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Control Desk Panel (takes remaining space) */}
      <div className="w-full md:w-[380px] bg-[#0f0f0f] border-t md:border-t-0 md:border-l border-neutral-900 p-6 flex flex-col justify-between shrink-0 overflow-y-auto">
        <div className="space-y-6">
          <div>
            <span className="text-[10px] font-mono tracking-widest text-amber-500 uppercase font-semibold">
              PREPARAÇÃO DO COMPLEMENTO
            </span>
            <h3 className="text-lg font-bold text-white tracking-tight mt-1 leading-snug">
              Edição Estética & Retoque
            </h3>
            <p className="text-xs text-neutral-500 mt-1.5 leading-relaxed">
              Escreva observações específicas para esta imagem (Ex: remover reflexo, atenuar imperfeições derme, saturação das cores).
            </p>
          </div>

          {/* Gift highlight banner in Zoom panel */}
          {proof.isBonus && (
            <div className="bg-amber-500/[0.08] border border-amber-500/30 rounded-2xl p-4 space-y-1.5">
              <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
                <Gift className="w-4 h-4 text-amber-400" /> Presente do Fotógrafo Dilson
              </span>
              <p className="text-xs text-amber-200/90 italic leading-relaxed">
                "{proof.bonusNote || defaultBonusMessage}"
              </p>
            </div>
          )}

          {/* Large Action Checker */}
          {!effectiveLock ? (
            <button
              onClick={() => onToggleSelect(proof.id)}
              className={`w-full p-4 rounded-2xl border transition-all duration-300 flex items-center gap-3.5 cursor-pointer ${
                proof.isSelected 
                  ? 'bg-amber-600/10 border-amber-500 text-amber-500' 
                  : 'bg-neutral-900/40 border-neutral-800 hover:border-neutral-700 text-neutral-400 hover:text-neutral-300'
              }`}
            >
              <div className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all ${
                proof.isSelected ? 'bg-amber-500 border-amber-400 text-black' : 'border-neutral-600'
              }`}>
                {proof.isSelected && <Check className="w-4 h-4 stroke-[3]" />}
              </div>
              <div className="text-left">
                <p className="text-xs font-mono font-bold uppercase tracking-wider">
                  {proof.isSelected ? 'IMAGEM SELECIONADA' : 'ESTA FOTO FICARÁ FORA'}
                </p>
                <p className="text-[10px] text-neutral-500 mt-0.5">
                  {proof.isSelected ? 'Adicionar ao lote de edição' : 'Clique para marcar e aprovar'}
                </p>
              </div>
            </button>
          ) : (
            <div className="bg-neutral-900 border border-neutral-800/80 rounded-2xl p-4 flex items-center gap-2 text-xs text-neutral-400">
              <EyeOff className="w-4 h-4 text-neutral-500" />
              <span>A seleção para este projeto já foi concluída e está travada para o cliente.</span>
            </div>
          )}

          {/* Photographer Bonus Action Button in Zoom */}
          {isAdmin && onToggleBonus && (
            <button
              type="button"
              onClick={() => onToggleBonus(proof.id)}
              className={`w-full p-3.5 rounded-xl border font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                proof.isBonus
                  ? 'bg-amber-500 text-black border-amber-400 shadow-lg shadow-orange-950/20'
                  : 'bg-[#181818] hover:bg-neutral-800 text-amber-400 border-amber-500/30'
              }`}
            >
              <Gift className="w-4 h-4" />
              <span>{proof.isBonus ? 'Remover Foto Brinde' : '🎁 Presentear Cliente com Esta Foto (Brinde)'}</span>
            </button>
          )}

          {/* Observations Frame */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-mono uppercase tracking-widest text-neutral-400 font-semibold flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-neutral-500" /> Observações de Edição
            </label>
            <textarea
              value={note}
              disabled={effectiveLock}
              onBlur={handleBlurSave}
              onChange={(e) => setNote(e.target.value)}
              placeholder={effectiveLock ? "Sem observações cadastradas." : "Escreva observações específicas para editar esta foto..."}
              rows={4}
              maxLength={400}
              className="w-full bg-[#141414] text-xs text-neutral-200 border border-neutral-800 rounded-xl p-3 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/25 resize-none font-sans"
            />
            {!effectiveLock && (
              <p className="text-[10px] text-neutral-600 italic">As observações são salvas automaticamente quando você desfoca a caixa de texto.</p>
            )}
          </div>
        </div>

        {/* Modal Bottom control buttons */}
        <div className="border-t border-neutral-900/60 pt-6 mt-6 flex md:flex-col gap-2">
          <button 
            type="button"
            onClick={onClose}
            className="flex-1 bg-neutral-900 hover:bg-neutral-800 text-xs font-mono font-bold uppercase tracking-widest text-neutral-300 py-3.5 rounded-xl border border-neutral-850 transition-colors cursor-pointer"
          >
            VOLTAR À GALERIA
          </button>
        </div>
      </div>
    </div>
  );
}
