/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckSquare, Sparkles, Send, CheckCircle2, 
  ArrowRight, Eye, LayoutGrid, DollarSign 
} from 'lucide-react';

interface FloatingSelectionBarProps {
  selectedCount: number;
  totalCount: number;
  contractedCount: number;
  bonusPhotosCount?: number;
  basePrice: number;
  extraPhotoPrice: number;
  isLocked: boolean;
  activeFilter: 'all' | 'selected' | 'notes';
  onFilterChange: (filter: 'all' | 'selected' | 'notes') => void;
  onOpenFinalizeModal: () => void;
}

export default function FloatingSelectionBar({
  selectedCount,
  totalCount,
  contractedCount,
  bonusPhotosCount = 0,
  basePrice,
  extraPhotoPrice,
  isLocked,
  activeFilter,
  onFilterChange,
  onOpenFinalizeModal,
}: FloatingSelectionBarProps) {
  const freeThreshold = contractedCount + (bonusPhotosCount || 0);
  const extraCount = Math.max(0, selectedCount - freeThreshold);
  const extraCost = extraCount * extraPhotoPrice;
  const totalPrice = basePrice + extraCost;
  const remainingInPackage = Math.max(0, freeThreshold - selectedCount);

  // Percentage of free quota used
  const percentUsed = freeThreshold > 0 ? Math.min(100, Math.round((selectedCount / freeThreshold) * 100)) : 0;

  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 25 }}
      className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-40 w-[95%] max-w-4xl"
    >
      <div className="bg-[#121212]/95 backdrop-blur-xl border border-neutral-800 shadow-2xl shadow-black/80 rounded-2xl p-3 sm:px-5 sm:py-3.5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 sm:gap-4">
        
        {/* Left: Counter & Quota Progress */}
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="relative w-11 h-11 shrink-0 flex items-center justify-center">
            {/* SVG Progress Circle */}
            <svg className="w-11 h-11 -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-neutral-800"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className={extraCount > 0 ? "text-[#E85E26]" : "text-amber-500"}
                strokeDasharray={`${percentUsed}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-xs font-bold font-mono text-white leading-none">
                {selectedCount}
              </span>
            </div>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-bold text-white font-sans truncate">
                {selectedCount} de {freeThreshold} fotos
              </span>

              {bonusPhotosCount > 0 && (
                <span className="text-[10px] font-mono font-bold bg-[#E85E26]/20 text-[#ff7236] border border-[#E85E26]/40 px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1">
                  🎁 +{bonusPhotosCount} brinde
                </span>
              )}

              {extraCount > 0 ? (
                <span className="text-[10px] font-mono font-bold uppercase bg-amber-500/20 text-amber-400 border border-amber-500/40 px-2 py-0.5 rounded-full shrink-0">
                  +{extraCount} extra{extraCount > 1 ? 's' : ''}
                </span>
              ) : remainingInPackage > 0 ? (
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded-full shrink-0">
                  {remainingInPackage} restante{remainingInPackage > 1 ? 's' : ''}
                </span>
              ) : (
                <span className="text-[10px] font-mono text-neutral-400 bg-neutral-800/60 px-2 py-0.5 rounded-full shrink-0">
                  Cota atingida
                </span>
              )}
            </div>

            <p className="text-[11px] text-neutral-400 font-mono truncate mt-0.5">
              {extraCount > 0 ? (
                <span>
                  Fotos extras: <strong className="text-neutral-200">+{extraCount} x R$ {extraPhotoPrice}</strong> = <strong className="text-[#ff7236]">+R$ {extraCost.toLocaleString('pt-BR')}</strong>
                </span>
              ) : (
                <span>
                  {bonusPhotosCount > 0 
                    ? `Pacote: ${contractedCount} + ${bonusPhotosCount} de cortesia grátis (${totalCount} brutas)` 
                    : `Inclusas no pacote contratado (${totalCount} provas no total)`}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Center / Right: Dynamic Price and Actions */}
        <div className="flex items-center justify-between md:justify-end gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-neutral-850">
          
          {/* Dynamic Total Price */}
          <div className="text-left md:text-right pr-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 block">
              Valor Total Atualizado
            </span>
            <div className="flex items-baseline md:justify-end gap-1.5">
              <span className={`text-base sm:text-lg font-mono font-bold ${extraCount > 0 ? 'text-[#E85E26]' : 'text-white'}`}>
                R$ {totalPrice.toLocaleString('pt-BR')}
              </span>
              {extraCount > 0 && (
                <span className="text-[10px] font-mono text-neutral-500 line-through">
                  R$ {basePrice.toLocaleString('pt-BR')}
                </span>
              )}
            </div>
          </div>

          {/* Quick Filter Toggle (Todas / Selecionadas) */}
          <button
            type="button"
            onClick={() => onFilterChange(activeFilter === 'selected' ? 'all' : 'selected')}
            className={`hidden sm:flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-mono transition-all border ${
              activeFilter === 'selected'
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/50 shadow-sm'
                : 'bg-neutral-900/80 hover:bg-neutral-800 text-neutral-300 border-neutral-800'
            }`}
            title="Ver apenas as fotos que você selecionou"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{activeFilter === 'selected' ? 'Ver Todas' : `Minhas (${selectedCount})`}</span>
          </button>

          {/* Primary Action Button */}
          {!isLocked ? (
            <button
              type="button"
              onClick={onOpenFinalizeModal}
              disabled={selectedCount === 0}
              className={`flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl font-mono text-xs font-bold uppercase tracking-wider transition-all shadow-lg active:scale-95 cursor-pointer ${
                selectedCount > 0
                  ? 'bg-[#E85E26] hover:bg-[#ff7236] text-white shadow-orange-950/40 hover:shadow-orange-600/20'
                  : 'bg-neutral-800 text-neutral-500 cursor-not-allowed opacity-60'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>Finalizar Lote ({selectedCount})</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 bg-emerald-950/60 border border-emerald-800/60 px-3.5 py-2.5 rounded-xl">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="text-left">
                <span className="text-[10px] font-mono uppercase font-bold text-emerald-400 block leading-tight">
                  Lote Homologado
                </span>
                <span className="text-[10px] font-mono text-neutral-400">
                  {selectedCount} fotos em edição
                </span>
              </div>
            </div>
          )}
        </div>

      </div>
    </motion.div>
  );
}
