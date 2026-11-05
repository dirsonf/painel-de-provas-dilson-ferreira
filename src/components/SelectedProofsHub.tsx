/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Project, Proof } from '../types';
import { 
  FolderCheck, ExternalLink, Copy, Check, RefreshCw, Eye,
  Sparkles, Gift, CheckCircle2, MessageSquare, AlertCircle, HardDrive, Filter, Maximize2
} from 'lucide-react';
import { getDriveFolderUrl } from '../lib/drive';

interface SelectedProofsHubProps {
  project: Project;
  selectedProofs: Proof[];
  allProofsCount: number;
  isAdmin: boolean;
  onOpenZoom: (proof: Proof) => void;
  onSyncSelectedFolder?: () => Promise<void>;
  isSyncingSelected?: boolean;
  onCopyToDrive?: () => Promise<void>;
  isCopyingToDrive?: boolean;
  onGoToProofsTab: () => void;
  onEditProject?: () => void;
}

export default function SelectedProofsHub({
  project,
  selectedProofs,
  allProofsCount,
  isAdmin,
  onOpenZoom,
  onSyncSelectedFolder,
  isSyncingSelected = false,
  onCopyToDrive,
  isCopyingToDrive = false,
  onGoToProofsTab,
  onEditProject
}: SelectedProofsHubProps) {
  const [filterMode, setFilterMode] = useState<'all' | 'notes'>('all');
  const [hasCopied, setHasCopied] = useState(false);

  const contractedCount = project.contractedCount || 10;
  const bonusCount = project.bonusPhotosCount || 0;
  const freeThreshold = contractedCount + bonusCount;
  const totalSelected = selectedProofs.length;
  const extraCount = Math.max(0, totalSelected - freeThreshold);
  const extraPrice = project.extraPhotoPrice !== undefined ? project.extraPhotoPrice : 75;
  const extraTotalValue = extraCount * extraPrice;

  const handleCopyFilenames = () => {
    if (selectedProofs.length === 0) return;
    const names = selectedProofs.map(p => p.name).join(', ');
    navigator.clipboard.writeText(names);
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 3000);
  };

  const displayedProofs = selectedProofs.filter(p => {
    if (filterMode === 'notes') return Boolean(p.clientNotes && p.clientNotes.trim());
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner / Metrics Overview */}
      <div className="bg-[#141414] border border-neutral-850 rounded-3xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[240px] h-[240px] bg-emerald-500/5 rounded-full filter blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-mono tracking-widest text-emerald-400 font-bold uppercase bg-emerald-950/40 border border-emerald-900/60 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                <FolderCheck className="w-3 h-3 text-emerald-400" /> Pasta 02 - SELECIONADAS
              </span>
              {bonusCount > 0 && (
                <span className="text-[10px] font-mono tracking-widest text-[#E85E26] font-bold uppercase bg-[#E85E26]/10 border border-[#E85E26]/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <Gift className="w-3 h-3 text-[#E85E26]" /> +{bonusCount} Foto(s) de Brinde
                </span>
              )}
            </div>

            <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
              Lote de Fotos Selecionadas ({totalSelected})
            </h2>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Aqui estão reunidas todas as fotografias escolhidas pelo cliente para tratamento e pós-produção profissional.
              {project.selectedDriveFolderId 
                ? ' Os arquivos selecionados podem ser direcionados diretamente para a Pasta 02 do Google Drive.' 
                : ' A pasta 02 do Drive ainda não foi associada a este ensaio.'}
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0 w-full lg:w-auto">
            {project.selectedDriveFolderId ? (
              <a
                href={getDriveFolderUrl(project.selectedDriveFolderId)}
                target="_blank"
                rel="noreferrer"
                className="bg-emerald-600 hover:bg-emerald-500 text-black font-mono font-bold text-xs uppercase tracking-wider px-4 py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer flex-1 sm:flex-initial"
              >
                <ExternalLink className="w-4 h-4 stroke-[2.5]" /> Abrir Pasta 02 no Drive
              </a>
            ) : (
              isAdmin && onEditProject && (
                <button
                  onClick={onEditProject}
                  className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-mono text-xs font-semibold px-4 py-3 rounded-xl transition-all cursor-pointer"
                >
                  Configurar Link da Pasta 02
                </button>
              )
            )}

            <button
              onClick={handleCopyFilenames}
              disabled={selectedProofs.length === 0}
              className="bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-200 text-xs font-mono font-semibold px-4 py-3 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-40"
              title="Copiar nomes dos arquivos selecionados para importar em lote no Adobe Lightroom ou Bridge"
            >
              {hasCopied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">Nomes Copiados!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-[#E85E26]" />
                  <span>Copiar Nomes (Lightroom)</span>
                </>
              )}
            </button>

            {onSyncSelectedFolder && (
              <button
                onClick={onSyncSelectedFolder}
                disabled={isSyncingSelected}
                className="bg-[#E85E26] hover:bg-[#ff7236] text-white text-xs font-mono font-bold uppercase tracking-wider px-4 py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-orange-950/20 transition-all cursor-pointer disabled:opacity-50"
                title="Lê as fotos que já estão na Pasta 02 do Google Drive e sincroniza automaticamente com o painel"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncingSelected ? 'animate-spin' : ''}`} />
                <span>{isSyncingSelected ? 'Sincronizando...' : 'Sincronizar Pasta 02'}</span>
              </button>
            )}

            {isAdmin && onCopyToDrive && (
              <button
                onClick={onCopyToDrive}
                disabled={isCopyingToDrive || selectedProofs.length === 0}
                className="bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 text-xs font-mono font-semibold px-4 py-3 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-40"
                title="Copia os arquivos selecionados do app para a Pasta 02 no Google Drive"
              >
                <HardDrive className={`w-4 h-4 ${isCopyingToDrive ? 'animate-spin text-amber-500' : 'text-neutral-400'}`} />
                <span>{isCopyingToDrive ? 'Copiando...' : 'Copiar p/ Pasta 02'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Breakdown Summary Cards */}
        <div className={`grid grid-cols-2 ${bonusCount > 0 ? 'sm:grid-cols-4' : 'sm:grid-cols-3'} gap-3.5 mt-6 pt-6 border-t border-neutral-850/80 font-mono`}>
          <div className="bg-[#0e0e0e] border border-neutral-900 rounded-2xl p-3.5">
            <span className="text-[10px] text-neutral-500 uppercase tracking-wider block">Pacote Contratado</span>
            <div className="mt-1.5 flex items-baseline gap-1">
              <span className="text-xl font-bold text-white font-sans">{contractedCount}</span>
              <span className="text-[10px] text-neutral-500">fotos</span>
            </div>
            <span className="text-[9px] text-neutral-600 block mt-0.5">Inclusas no contrato</span>
          </div>

          {bonusCount > 0 && (
            <div className="bg-[#0e0e0e] border border-[#E85E26]/20 bg-[#E85E26]/[0.02] rounded-2xl p-3.5">
              <span className="text-[10px] text-[#E85E26] uppercase tracking-wider font-bold block flex items-center gap-1">
                <Gift className="w-3 h-3" /> Brinde / Cortesia
              </span>
              <div className="mt-1.5 flex items-baseline gap-1">
                <span className="text-xl font-bold text-[#E85E26] font-sans">+{bonusCount}</span>
                <span className="text-[10px] text-neutral-500">grátis</span>
              </div>
              <span className="text-[9px] text-neutral-500 block mt-0.5">Presente do fotógrafo</span>
            </div>
          )}

          <div className="bg-[#0e0e0e] border border-neutral-900 rounded-2xl p-3.5">
            <span className="text-[10px] text-neutral-500 uppercase tracking-wider block">Total Selecionado</span>
            <div className="mt-1.5 flex items-baseline gap-1">
              <span className="text-xl font-bold text-emerald-400 font-sans">{totalSelected}</span>
              <span className="text-[10px] text-neutral-500">/ {allProofsCount} brutas</span>
            </div>
            <span className="text-[9px] text-neutral-600 block mt-0.5">Homologadas pelo cliente</span>
          </div>

          <div className="bg-[#0e0e0e] border border-neutral-900 rounded-2xl p-3.5">
            <span className="text-[10px] text-neutral-500 uppercase tracking-wider block">Fotos Extras</span>
            <div className="mt-1.5 flex items-baseline gap-1">
              <span className={`text-xl font-bold font-sans ${extraCount > 0 ? 'text-[#E85E26]' : 'text-neutral-400'}`}>
                {extraCount}
              </span>
              {extraCount > 0 && (
                <span className="text-[10px] text-[#E85E26] font-semibold">
                  (R$ {extraTotalValue.toLocaleString('pt-BR')})
                </span>
              )}
            </div>
            <span className="text-[9px] text-neutral-600 block mt-0.5">
              {extraCount > 0 ? `R$ ${extraPrice} por foto extra` : 'Sem excedente'}
            </span>
          </div>
        </div>

        {/* Client Final Notes Alert */}
        {project.clientFinalNotes && project.clientFinalNotes.trim() && (
          <div className="mt-4 bg-neutral-900/60 border border-neutral-800 rounded-2xl p-4 flex items-start gap-3">
            <MessageSquare className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-bold text-neutral-200 uppercase tracking-wide font-mono text-[10px]">
                Instruções Gerais do Cliente na Homologação do Lote:
              </p>
              <p className="text-neutral-300 mt-1 italic leading-relaxed">
                "{project.clientFinalNotes}"
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Filter and Content Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-neutral-900 pb-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <span>Fotos do Lote de Seleção</span>
            <span className="text-xs font-mono font-bold bg-neutral-800 text-neutral-300 px-2 py-0.5 rounded-full">
              {displayedProofs.length}
            </span>
          </h3>
          <p className="text-xs text-neutral-400 mt-0.5">
            Clique em qualquer imagem para inspecionar os detalhes, notas de retoque ou navegar em tela cheia.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-semibold transition-all cursor-pointer border ${
              filterMode === 'all'
                ? 'bg-neutral-800 text-white border-neutral-700 shadow-sm'
                : 'bg-neutral-900/60 text-neutral-400 border-neutral-850 hover:text-white'
            }`}
          >
            Todas Selecionadas ({selectedProofs.length})
          </button>

          <button
            type="button"
            onClick={() => setFilterMode('notes')}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-semibold transition-all cursor-pointer border ${
              filterMode === 'notes'
                ? 'bg-[#E85E26] text-white border-[#E85E26]'
                : 'bg-neutral-900/60 text-neutral-400 border-neutral-850 hover:text-white'
            }`}
          >
            Com Instruções ({selectedProofs.filter(p => p.clientNotes && p.clientNotes.trim()).length})
          </button>
        </div>
      </div>

      {/* Empty State */}
      {selectedProofs.length === 0 ? (
        <div className="bg-[#121212] border border-neutral-850 rounded-3xl p-8 sm:p-12 text-center max-w-lg mx-auto space-y-4 my-8">
          <FolderCheck className="w-12 h-12 text-neutral-600 mx-auto" />
          <div className="space-y-1">
            <h4 className="text-base font-bold text-white">Nenhuma foto selecionada exibida ainda</h4>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Se você ou sua cliente já colocaram as fotos na <strong className="text-neutral-200">Pasta 02 - SELECIONADAS</strong> no Google Drive, clique no botão abaixo para sincronizá-las agora.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            {onSyncSelectedFolder && (
              <button
                type="button"
                onClick={onSyncSelectedFolder}
                disabled={isSyncingSelected}
                className="bg-[#E85E26] hover:bg-[#ff7236] text-white font-mono text-xs font-bold uppercase tracking-wider px-5 py-3 rounded-xl transition-all cursor-pointer shadow-lg shadow-orange-950/20 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncingSelected ? 'animate-spin' : ''}`} />
                <span>{isSyncingSelected ? 'Sincronizando...' : 'Sincronizar Pasta 02 do Drive'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={onGoToProofsTab}
              className="bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 font-mono text-xs font-semibold px-4 py-3 rounded-xl transition-all cursor-pointer"
            >
              Ver Galeria de Provas (01)
            </button>
          </div>
        </div>
      ) : (
        /* Grid of Selected Proofs with Distinct Badges */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {displayedProofs.map((proof, index) => {
            // Determine tier category: Package vs Bonus vs Extra
            const isPackage = index < contractedCount && !proof.isBonus;
            const isBonus = Boolean(proof.isBonus) || (bonusCount > 0 && !isPackage && index < freeThreshold);
            const isExtra = !isBonus && index >= freeThreshold;

            return (
              <div 
                key={proof.id}
                className={`bg-[#141414] border rounded-2xl overflow-hidden group transition-all duration-200 flex flex-col justify-between ${
                  proof.isBonus
                    ? 'border-amber-500/80 ring-1 ring-amber-500/30 shadow-lg shadow-orange-950/20'
                    : 'border-neutral-850 hover:border-neutral-700'
                }`}
              >
                {/* Photo Image preview */}
                <div 
                  className="relative aspect-4/5 w-full bg-neutral-900 overflow-hidden cursor-pointer"
                  onClick={() => onOpenZoom(proof)}
                >
                  <img
                    src={proof.thumbnailUrl || proof.fullUrl}
                    alt={proof.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
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

                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

                  {/* Top Status Badges */}
                  <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1 pointer-events-none">
                    <span className="font-mono text-[9px] font-bold px-2 py-0.5 rounded-md backdrop-blur-md bg-black/60 text-neutral-300 border border-white/10">
                      #{index + 1}
                    </span>

                    {/* Tier badge */}
                    {proof.isBonus ? (
                      <span className="font-mono text-[9px] font-bold px-2 py-0.5 rounded-md bg-gradient-to-r from-amber-400 to-orange-400 text-black uppercase flex items-center gap-1 shadow-md">
                        <Gift className="w-2.5 h-2.5" /> Brinde do Dilson
                      </span>
                    ) : isPackage ? (
                      <span className="font-mono text-[9px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/90 text-black uppercase">
                        Pacote Base
                      </span>
                    ) : isBonus ? (
                      <span className="font-mono text-[9px] font-bold px-2 py-0.5 rounded-md bg-[#E85E26] text-white uppercase flex items-center gap-1 shadow-md">
                        <Gift className="w-2.5 h-2.5" /> Brinde
                      </span>
                    ) : isExtra ? (
                      <span className="font-mono text-[9px] font-bold px-2 py-0.5 rounded-md bg-amber-400 text-black uppercase">
                        Foto Extra
                      </span>
                    ) : null}
                  </div>

                  {/* Zoom action icon */}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onOpenZoom(proof); }}
                    className="absolute bottom-2.5 right-2.5 p-2 rounded-xl bg-black/60 backdrop-blur-md text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/90 cursor-pointer"
                    title="Expandir foto"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Details Footer */}
                <div className="p-3.5 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-mono font-medium text-neutral-200 truncate" title={proof.name}>
                      {proof.name}
                    </p>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  </div>

                  {/* Photographer gift callout */}
                  {proof.isBonus && (
                    <div className="bg-amber-500/[0.08] border border-amber-500/30 rounded-xl p-2.5 text-[11px] text-amber-200">
                      <span className="font-mono font-bold text-[9px] text-amber-400 uppercase tracking-widest flex items-center gap-1 mb-0.5">
                        <Gift className="w-3 h-3 text-amber-400" /> Presente do Fotógrafo Dilson
                      </span>
                      <p className="italic leading-snug">
                        "{proof.bonusNote || 'Essa eu curti demais e não poderia ficar de fora do projeto! 🎁'}"
                      </p>
                    </div>
                  )}

                  {/* Client Notes if any */}
                  {proof.clientNotes && proof.clientNotes.trim() ? (
                    <div className="bg-[#0d0d0d] border border-neutral-800 rounded-xl p-2.5 text-[11px] text-neutral-300 flex items-start gap-2">
                      <MessageSquare className="w-3.5 h-3.5 text-[#E85E26] shrink-0 mt-0.5" />
                      <p className="line-clamp-2 italic leading-relaxed">
                        "{proof.clientNotes}"
                      </p>
                    </div>
                  ) : !proof.isBonus ? (
                    <p className="text-[10px] text-neutral-600 font-mono italic">
                      Sem notas específicas de retoque.
                    </p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
