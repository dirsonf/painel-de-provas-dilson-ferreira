/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Check, Square, CheckSquare, MessageSquare, Maximize2, Send, 
  Clock, Gift, Sparkles 
} from 'lucide-react';
import { Proof } from '../types';

interface ImageProofCardProps {
  key?: string;
  proof: Proof;
  onToggleSelect: (id: string) => void;
  onUpdateNotes: (id: string, notes: string) => void;
  onZoom: (proof: Proof) => void;
  statusLock: boolean;
  isAdmin?: boolean;
  onToggleBonus?: (id: string) => void;
}

export default function ImageProofCard({ 
  proof, 
  onToggleSelect, 
  onUpdateNotes, 
  onZoom, 
  statusLock,
  isAdmin = false,
  onToggleBonus
}: ImageProofCardProps) {
  const [noteText, setNoteText] = useState(proof.clientNotes || '');
  const [isEditingNote, setIsEditingNote] = useState(false);

  // If viewing as Photographer (admin), edits and selections are never locked!
  const effectiveLock = isAdmin ? false : statusLock;

  const handleSaveNote = () => {
    onUpdateNotes(proof.id, noteText);
    setIsEditingNote(false);
  };

  const defaultBonusMessage = "Essa eu curti demais e não poderia ficar de fora do projeto! 🎁";

  return (
    <div 
      className={`group relative flex flex-col bg-[#141414] border rounded-2xl overflow-hidden transition-all duration-300 ${
        proof.isBonus
          ? 'border-amber-500/80 ring-1 ring-amber-500/30 shadow-lg shadow-orange-950/20'
          : proof.isSelected 
          ? 'border-amber-500 shadow-md shadow-amber-900/10' 
          : 'border-neutral-800/80 hover:border-neutral-700/80'
      }`}
    >
      {/* Photo canvas container */}
      <div className="relative aspect-[3/4] bg-[#0c0c0c] overflow-hidden cursor-pointer" onClick={() => onZoom(proof)}>
        <img 
          src={proof.thumbnailUrl} 
          alt={proof.name} 
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover select-none transition-transform duration-500 ease-out group-hover:scale-105"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            const driveId = proof.driveFileId || proof.id;
            if (!target.dataset.triedThumb && driveId && !driveId.startsWith('proof_') && !driveId.startsWith('sample_')) {
              target.dataset.triedThumb = 'true';
              target.src = `https://drive.google.com/thumbnail?id=${driveId}&sz=w800`;
              return;
            }
            if (!target.dataset.triedLh3 && driveId && !driveId.startsWith('proof_') && !driveId.startsWith('sample_')) {
              target.dataset.triedLh3 = 'true';
              target.src = `https://lh3.googleusercontent.com/d/${driveId}`;
              return;
            }
            target.src = 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=600';
          }}
        />

        {/* Shading scrim overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Top-left Quick Selection Toggle */}
        {!effectiveLock && (
          <button 
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect(proof.id);
            }}
            className="absolute top-3 left-3 z-10 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md transition-all border duration-200 cursor-pointer shadow-md"
            style={{
              backgroundColor: proof.isSelected ? '#d97706' : 'rgba(15, 15, 15, 0.75)',
              borderColor: proof.isSelected ? '#f59e0b' : 'rgba(255,255,255,0.15)',
              color: proof.isSelected ? '#000000' : '#ffffff'
            }}
            title={proof.isSelected ? 'Desmarcar seleção' : 'Selecionar esta foto'}
          >
            {proof.isSelected ? <CheckSquare className="w-4 h-4 fill-current stroke-[2.5]" /> : <Square className="w-4 h-4 opacity-75" />}
          </button>
        )}

        {/* Top-right Actions: Magnify + Photographer Bonus toggle */}
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
          {/* Admin Bonus Trigger Button */}
          {isAdmin && onToggleBonus && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleBonus(proof.id);
              }}
              className={`h-8 px-2.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1 transition-all border backdrop-blur-md cursor-pointer ${
                proof.isBonus
                  ? 'bg-amber-500 text-black border-amber-400 shadow-lg'
                  : 'bg-black/75 hover:bg-neutral-800 text-neutral-300 hover:text-white border-white/10'
              }`}
              title={proof.isBonus ? 'Remover status de foto brinde' : 'Presentear cliente com esta foto de brinde!'}
            >
              <Gift className="w-3.5 h-3.5" />
              <span>{proof.isBonus ? 'Brinde Ativo' : '+ Brinde'}</span>
            </button>
          )}

          {/* Magnify Quick Action */}
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onZoom(proof);
            }}
            className="w-8 h-8 rounded-full bg-black/75 hover:bg-amber-500 hover:text-black transition-colors border border-white/10 flex items-center justify-center cursor-pointer"
            title="Ampliar foto"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Proof status label banner */}
        <div className="absolute bottom-3 left-3 right-3 z-10 flex flex-wrap items-center gap-1.5 pointer-events-none">
          <span className="text-[9px] font-mono tracking-wider font-semibold text-white/90 bg-neutral-900/90 py-0.5 px-2 rounded-full border border-white/10">
            {proof.name.split('_').pop() || proof.name}
          </span>
          {proof.isBonus ? (
            <span className="text-[9px] font-mono font-bold text-black bg-gradient-to-r from-amber-400 to-orange-400 py-0.5 px-2.5 rounded-full shadow-lg flex items-center gap-1 uppercase tracking-wider">
              <Gift className="w-2.5 h-2.5" /> Presente do Fotógrafo
            </span>
          ) : proof.isSelected ? (
            <span className="text-[9px] font-mono font-bold text-black bg-amber-500 py-0.5 px-2 rounded-full shadow-md uppercase tracking-widest">
              SELECIONADA
            </span>
          ) : null}
        </div>
      </div>

      {/* Editing comments and metadata body */}
      <div className="p-3.5 flex flex-col flex-1 border-t border-neutral-900">
        <div className="flex items-start gap-1 justify-between mb-1.5">
          <span className="text-[10px] font-mono text-neutral-500 truncate" title={proof.name}>
            {proof.name}
          </span>
          {proof.clientNotes && (
            <span className="flex items-center gap-1 text-[10px] text-amber-500 font-medium">
              <MessageSquare className="w-3 h-3" /> Nota
            </span>
          )}
        </div>

        {/* Special Gift Highlight Card */}
        {proof.isBonus && (
          <div className="bg-amber-500/[0.08] border border-amber-500/25 rounded-xl p-2.5 mb-2.5">
            <span className="text-[9px] font-mono font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1">
              <Gift className="w-3 h-3 text-amber-400 shrink-0" />
              Cortesia Especial de Dilson Ferreira
            </span>
            <p className="text-[11px] text-amber-200/90 italic mt-0.5 leading-snug">
              "{proof.bonusNote || defaultBonusMessage}"
            </p>
          </div>
        )}

        {/* Selection / Review lock comments area */}
        {isEditingNote ? (
          <div className="flex flex-col gap-2 mt-1">
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Ex: Suavizar o fundo, ajustar iluminação no rosto, limpar pontos..."
              rows={3}
              maxLength={200}
              className="w-full bg-[#0d0d0d] text-xs text-neutral-200 border border-amber-500/50 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none font-sans"
            />
            <div className="flex items-center justify-end gap-1.5">
              <button 
                onClick={() => setIsEditingNote(false)}
                className="text-[10px] font-mono text-neutral-500 px-2 py-1 rounded hover:bg-neutral-950 cursor-pointer"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSaveNote}
                className="text-[10px] font-mono bg-amber-600 hover:bg-amber-500 text-black font-bold px-2.5 py-1 rounded flex items-center gap-1 cursor-pointer"
              >
                <Send className="w-2.5 h-2.5 ml-0.5" /> Salvar
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col flex-1 justify-between">
            {proof.clientNotes ? (
              <div 
                className={`text-[11px] text-neutral-300 bg-neutral-900/40 border border-neutral-800/60 rounded-lg px-2.5 py-2 mb-2 italic ${
                  !effectiveLock ? 'cursor-pointer hover:border-neutral-700' : ''
                }`}
                onClick={() => !effectiveLock && setIsEditingNote(true)}
              >
                "{proof.clientNotes}"
              </div>
            ) : (
              <p className="text-[11px] text-neutral-600 italic mb-2">
                Nenhuma nota de edição.
              </p>
            )}

            {!effectiveLock ? (
              <button 
                onClick={() => setIsEditingNote(true)}
                className="text-[11px] font-mono text-amber-500 hover:text-amber-400 font-semibold flex items-center gap-1 w-fit transition-colors mt-1 cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                {proof.clientNotes ? 'Editar observações' : 'Adicionar observações de edição'}
              </button>
            ) : (
              <div className="text-[10px] font-mono text-neutral-500 flex items-center gap-1 mt-1">
                <Clock className="w-3 h-3" /> Seleção bloqueada
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
