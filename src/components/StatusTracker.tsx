/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Check, Camera, Image, CheckSquare, Edit3, CheckCircle2, Clock } from 'lucide-react';

interface StatusTrackerProps {
  currentStatus: 'uploaded' | 'reviewing' | 'approved' | 'editing' | 'partial_delivered' | 'delivered';
  deliveredCount?: number;
}

const STEPS = [
  { id: 'uploaded', label: 'Provas Carregadas', desc: 'Edições brutas enviadas pelo fotógrafo', icon: Camera },
  { id: 'reviewing', label: 'Seleção do Cliente', desc: 'Em revisão e comentários das fotos', icon: Image },
  { id: 'approved', label: 'Seleção Aprovada', desc: 'Lote homologado para pós-produção', icon: CheckSquare },
  { id: 'editing', label: 'Em Retoque', desc: 'Calibração estética e color grading', icon: Edit3 },
  { id: 'partial_delivered', label: 'Entrega Parcial', desc: 'Lote preliminar liberado para download', icon: Clock },
  { id: 'delivered', label: 'Entrega Concluída', desc: 'Material final 100% entregue', icon: CheckCircle2 }
];

export default function StatusTracker({ currentStatus, deliveredCount }: StatusTrackerProps) {
  const currentIdx = STEPS.findIndex(step => step.id === currentStatus);

  return (
    <div className="w-full bg-[#181818]/60 backdrop-blur-md border border-neutral-800/80 rounded-2xl p-6 sm:p-8">
      <h3 className="text-sm font-mono tracking-widest text-amber-500 uppercase mb-6">
        FASE DO SERVIÇO DE EDIÇÃO
      </h3>

      {/* Horizontal tracker for md+ screens */}
      <div className="hidden md:flex items-center justify-between relative w-full">
        {/* Continuous progress line in background */}
        <div className="absolute top-[26%] left-[6%] right-[6%] h-[2px] bg-neutral-800 -translate-y-1/2 z-0" />
        <div 
          className="absolute top-[26%] left-[6%] h-[2px] bg-amber-500 -translate-y-1/2 z-0 transition-all duration-700 ease-out"
          style={{ width: `${(currentIdx / (STEPS.length - 1)) * 88}%` }}
        />

        {STEPS.map((step, idx) => {
          const StepIcon = step.icon;
          const isCompleted = idx < currentIdx;
          const isActive = idx === currentIdx;
          const isUpcoming = idx > currentIdx;

          return (
            <div key={step.id} className="flex flex-col items-center flex-1 text-center z-10 px-2">
              <div 
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isCompleted 
                    ? 'bg-amber-600 border-2 border-amber-500 text-white shadow-lg shadow-amber-900/30' 
                    : isActive 
                    ? 'bg-[#1e1e1e] border-2 border-amber-500 text-amber-500 ring-4 ring-amber-500/10' 
                    : 'bg-[#121212] border-2 border-neutral-800 text-neutral-600'
                }`}
              >
                {isCompleted ? <Check className="w-5 h-5 stroke-[2.5]" /> : <StepIcon className="w-5 h-5" />}
              </div>
              <p className={`mt-3 text-xs font-semibold tracking-wide ${isActive ? 'text-amber-500 font-bold' : isCompleted ? 'text-neutral-300' : 'text-neutral-500'}`}>
                {step.label}
              </p>
              <p className="mt-1 text-[10px] text-neutral-600 line-clamp-2 max-w-[130px] mx-auto">
                {step.desc}
              </p>
            </div>
          );
        })}
      </div>

      {/* Vertical timeline for mobile screens */}
      <div className="flex md:hidden flex-col gap-6 relative pl-4">
        {/* Background vertical pipe */}
        <div className="absolute top-4 bottom-4 left-[27px] w-[2px] bg-neutral-800 z-0" />
        <div 
          className="absolute top-4 left-[27px] w-[2px] bg-amber-500 z-0 transition-all duration-700" 
          style={{ height: `${(currentIdx / (STEPS.length - 1)) * 90}%` }}
        />

        {STEPS.map((step, idx) => {
          const StepIcon = step.icon;
          const isCompleted = idx < currentIdx;
          const isActive = idx === currentIdx;

          return (
            <div key={step.id} className="flex gap-4 items-start z-10">
              <div 
                className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${
                  isCompleted 
                    ? 'bg-amber-600 border-2 border-amber-500 text-white' 
                    : isActive 
                    ? 'bg-[#1e1e1e] border-2 border-amber-500 text-amber-500 ring-4 ring-amber-500/15' 
                    : 'bg-[#121212] border-2 border-neutral-800 text-neutral-600'
                }`}
              >
                {isCompleted ? <Check className="w-4 h-4 stroke-[2.5]" /> : <StepIcon className="w-4 h-4" />}
              </div>
              <div>
                <p className={`text-xs font-semibold ${isActive ? 'text-amber-500 font-bold' : isCompleted ? 'text-neutral-300' : 'text-neutral-500'}`}>
                  {step.label}
                </p>
                <p className="text-[11px] text-neutral-600 mt-0.5">
                  {step.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
