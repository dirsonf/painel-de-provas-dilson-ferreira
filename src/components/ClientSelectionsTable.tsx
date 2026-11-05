/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Project, Proof } from '../types';
import { 
  Search, Filter, ExternalLink, Download, Copy, Check, Folder, 
  FolderSync, User, Mail, Phone, Calendar, ArrowRight, Eye, 
  DollarSign, Sparkles, CheckCircle2, Clock, AlertCircle, RefreshCw, X
} from 'lucide-react';
import { getDriveFolderUrl, copySelectedProofsToDriveFolder, extractDriveFolderId } from '../lib/drive';
import { collection, getDocs, query, where, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db, getAccessToken } from '../lib/firebase';

interface ClientSelectionsTableProps {
  projects: Project[];
  onSelectProject: (projectId: string) => void;
  onUpdateStatus: (projectId: string, newStatus: Project['status']) => void;
  onRefreshDrive: (projectId: string) => void;
}

export default function ClientSelectionsTable({
  projects,
  onSelectProject,
  onUpdateStatus,
  onRefreshDrive
}: ClientSelectionsTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [onlyExtras, setOnlyExtras] = useState(false);

  // Modal / Detail state for inspecting a specific client's selections
  const [selectedProjectForDetail, setSelectedProjectForDetail] = useState<Project | null>(null);
  const [detailedProofs, setDetailedProofs] = useState<Proof[]>([]);
  const [loadingProofs, setLoadingProofs] = useState(false);

  // Copying feedback states
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isDriveCopying, setIsDriveCopying] = useState(false);
  const [driveCopyProgress, setDriveCopyProgress] = useState<string | null>(null);
  const [driveCopyResult, setDriveCopyResult] = useState<{ success: number; failed: number } | null>(null);

  // Quick edit folders modal state
  const [editingFolderProj, setEditingFolderProj] = useState<Project | null>(null);
  const [rawFolderInput, setRawFolderInput] = useState('');
  const [selectedFolderInput, setSelectedFolderInput] = useState('');
  const [deliveredFolderInput, setDeliveredFolderInput] = useState('');
  const [savingFolders, setSavingFolders] = useState(false);

  // Computed metrics
  const totalProjects = projects.length;
  const totalContracted = projects.reduce((acc, p) => acc + (p.contractedCount || 10), 0);
  const totalBonus = projects.reduce((acc, p) => acc + (p.bonusPhotosCount || 0), 0);
  const totalSelected = projects.reduce((acc, p) => acc + (p.selectedCount || 0), 0);
  const totalExtras = projects.reduce((acc, p) => {
    const freeThreshold = (p.contractedCount || 10) + (p.bonusPhotosCount || 0);
    return acc + Math.max(0, (p.selectedCount || 0) - freeThreshold);
  }, 0);
  
  const totalRevenue = projects.reduce((acc, p) => {
    const base = p.priceEstimate || 0;
    const freeThreshold = (p.contractedCount || 10) + (p.bonusPhotosCount || 0);
    const extras = Math.max(0, (p.selectedCount || 0) - freeThreshold);
    const extraPrice = p.extraPhotoPrice !== undefined ? p.extraPhotoPrice : 75;
    return acc + base + (extras * extraPrice);
  }, 0);

  const totalExtrasRevenue = projects.reduce((acc, p) => {
    const freeThreshold = (p.contractedCount || 10) + (p.bonusPhotosCount || 0);
    const extras = Math.max(0, (p.selectedCount || 0) - freeThreshold);
    const extraPrice = p.extraPhotoPrice !== undefined ? p.extraPhotoPrice : 75;
    return acc + (extras * extraPrice);
  }, 0);

  // Filtered projects
  const filteredProjects = projects.filter((p) => {
    const matchesSearch = 
      p.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.clientEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.clientPhone && p.clientPhone.includes(searchTerm));

    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    const freeThreshold = (p.contractedCount || 10) + (p.bonusPhotosCount || 0);
    const extras = Math.max(0, (p.selectedCount || 0) - freeThreshold);
    const matchesExtras = !onlyExtras || extras > 0;

    return matchesSearch && matchesStatus && matchesExtras;
  });

  // Load client detailed photo selections
  const handleOpenClientDetail = async (project: Project) => {
    setSelectedProjectForDetail(project);
    setLoadingProofs(true);
    setDriveCopyResult(null);
    setDriveCopyProgress(null);
    try {
      const proofsCol = collection(db, 'projects', project.id, 'proofs');
      // Fetch selected proofs
      const snap = await getDocs(proofsCol);
      const prfs: Proof[] = [];
      snap.forEach((d) => {
        const data = d.data();
        prfs.push({
          id: data.id,
          driveFileId: data.driveFileId,
          name: data.name,
          thumbnailUrl: data.thumbnailUrl,
          fullUrl: data.fullUrl,
          status: data.status,
          clientNotes: data.clientNotes,
          isSelected: data.isSelected || false,
          updatedAt: data.updatedAt
        });
      });
      // Sort: selected first, then alphabetically
      prfs.sort((a, b) => {
        if (a.isSelected === b.isSelected) {
          return a.name.localeCompare(b.name, undefined, { numeric: true });
        }
        return a.isSelected ? -1 : 1;
      });
      setDetailedProofs(prfs);
    } catch (e) {
      console.error('Failed to load proofs for client:', e);
    } finally {
      setLoadingProofs(false);
    }
  };

  // Copy Lightroom filenames list
  const handleCopyLightroomList = (proofList: Proof[], id: string) => {
    const selected = proofList.filter(p => p.isSelected);
    if (selected.length === 0) {
      alert('Nenhuma foto selecionada ainda para este cliente.');
      return;
    }
    // Lightroom / Camera Raw filter syntax: comma-separated or space-separated
    const fileNames = selected.map(p => p.name).join(', ');
    navigator.clipboard.writeText(fileNames);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 3000);
  };

  // Export full CSV of clients and selections
  const handleExportCSV = () => {
    const headers = [
      'Cliente',
      'E-mail',
      'Telefone',
      'Ensaio / Projeto',
      'Status',
      'Fotos Contratadas',
      'Fotos Selecionadas',
      'Fotos Extras',
      'Valor Base (R$)',
      'Valor Extras (R$)',
      'Total Consolidado (R$)',
      'Data de Entrega',
      'Pasta Provas Drive',
      'Pasta Selecionadas Drive',
      'Pasta Entrega Final Drive'
    ];

    const rows = filteredProjects.map(p => {
      const extras = Math.max(0, (p.selectedCount || 0) - (p.contractedCount || 10));
      const extraPrice = p.extraPhotoPrice !== undefined ? p.extraPhotoPrice : 75;
      const extrasTotal = extras * extraPrice;
      const grandTotal = (p.priceEstimate || 0) + extrasTotal;

      return [
        `"${p.clientName.replace(/"/g, '""')}"`,
        `"${p.clientEmail}"`,
        `"${p.clientPhone || ''}"`,
        `"${p.projectName.replace(/"/g, '""')}"`,
        `"${p.status}"`,
        p.contractedCount || 10,
        p.selectedCount || 0,
        extras,
        (p.priceEstimate || 0).toFixed(2),
        extrasTotal.toFixed(2),
        grandTotal.toFixed(2),
        p.deliveryEstimate || '',
        p.driveFolderId || '',
        p.selectedDriveFolderId || '',
        p.deliveredDriveFolderId || ''
      ].join(';');
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `base_dados_selecoes_dilson_ferreira_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Directing / Copying Selected Photos into Drive Folder
  const handleCopySelectedToDrive = async (project: Project, proofsToCopy: Proof[]) => {
    const targetFolder = project.selectedDriveFolderId;
    if (!targetFolder) {
      setEditingFolderProj(project);
      setRawFolderInput(project.driveFolderId || '');
      setSelectedFolderInput(project.selectedDriveFolderId || '');
      setDeliveredFolderInput(project.deliveredDriveFolderId || '');
      alert('Por favor, configure o ID ou link da Pasta de Fotos Selecionadas do Google Drive primeiro.');
      return;
    }

    const selected = proofsToCopy.filter(p => p.isSelected);
    if (selected.length === 0) {
      alert('Nenhuma foto selecionada pelo cliente ainda.');
      return;
    }

    const token = getAccessToken();
    if (!token) {
      alert('Token de acesso do Google Drive expirado. Por favor, refaça o login no topo.');
      return;
    }

    const confirmCopy = window.confirm(
      `Deseja direcionar e copiar ${selected.length} foto(s) selecionadas para a pasta do Google Drive (${extractDriveFolderId(targetFolder)})?`
    );
    if (!confirmCopy) return;

    setIsDriveCopying(true);
    setDriveCopyResult(null);

    try {
      const result = await copySelectedProofsToDriveFolder(
        selected,
        targetFolder,
        token,
        (done, total, fileName) => {
          setDriveCopyProgress(`Copiando ${done}/${total}: ${fileName}`);
        }
      );

      setDriveCopyResult({ success: result.success, failed: result.failed });
      setDriveCopyProgress(null);
    } catch (e: any) {
      console.error('Error during Drive copy batch:', e);
      alert('Erro ao copiar para o Google Drive: ' + (e?.message || 'Falha de comunicação.'));
    } finally {
      setIsDriveCopying(false);
    }
  };

  // Open edit folders modal
  const handleOpenEditFolders = (project: Project) => {
    setEditingFolderProj(project);
    setRawFolderInput(project.driveFolderId || '');
    setSelectedFolderInput(project.selectedDriveFolderId || '');
    setDeliveredFolderInput(project.deliveredDriveFolderId || '');
  };

  // Save updated folder IDs in Firestore
  const handleSaveFolders = async () => {
    if (!editingFolderProj) return;
    setSavingFolders(true);
    try {
      const cleanRaw = extractDriveFolderId(rawFolderInput);
      const cleanSel = selectedFolderInput.trim() ? extractDriveFolderId(selectedFolderInput) : '';
      const cleanDel = deliveredFolderInput.trim() ? extractDriveFolderId(deliveredFolderInput) : '';

      await updateDoc(doc(db, 'projects', editingFolderProj.id), {
        driveFolderId: cleanRaw,
        selectedDriveFolderId: cleanSel,
        deliveredDriveFolderId: cleanDel,
        updatedAt: serverTimestamp()
      });

      // Update in-memory state if in modal
      if (selectedProjectForDetail && selectedProjectForDetail.id === editingFolderProj.id) {
        setSelectedProjectForDetail({
          ...selectedProjectForDetail,
          driveFolderId: cleanRaw,
          selectedDriveFolderId: cleanSel,
          deliveredDriveFolderId: cleanDel
        });
      }

      setEditingFolderProj(null);
    } catch (e) {
      console.error('Failed to update project drive folders:', e);
      alert('Erro ao salvar pastas do Google Drive.');
    } finally {
      setSavingFolders(false);
    }
  };

  return (
    <div className="w-full space-y-6 animate-fade-in font-sans">
      {/* 1. Header Overview & Financial Metrics Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
        <div className="bg-[#121212] border border-neutral-900 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 font-bold">TOTAL CLIENTES</span>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-mono font-bold text-white">{totalProjects}</span>
            <span className="text-xs text-neutral-500">ensaios</span>
          </div>
        </div>

        <div className="bg-[#121212] border border-neutral-900 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 font-bold">FOTOS CONTRATADAS</span>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-mono font-bold text-neutral-300">{totalContracted}</span>
            <span className="text-xs text-neutral-500">base</span>
          </div>
        </div>

        <div className="bg-[#121212] border border-neutral-900 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold">SELECIONADAS</span>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-mono font-bold text-emerald-400">{totalSelected}</span>
            <span className="text-xs text-neutral-500">aprovadas</span>
          </div>
        </div>

        <div className="bg-[#121212] border border-neutral-900 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#E85E26] font-bold">FOTOS EXTRAS</span>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-mono font-bold text-[#E85E26]">+{totalExtras}</span>
            <span className="text-xs text-neutral-500">além da base</span>
          </div>
        </div>

        <div className="bg-[#121212] border border-neutral-900 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#E85E26] font-bold">RECEITA EXTRAS</span>
          <div className="mt-2">
            <span className="text-xl font-mono font-bold text-[#E85E26]">
              R$ {totalExtrasRevenue.toLocaleString('pt-BR')}
            </span>
          </div>
        </div>

        <div className="bg-[#141414] border border-orange-500/20 bg-gradient-to-br from-orange-500/5 to-transparent rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[10px] font-mono uppercase tracking-wider text-orange-400 font-bold">FATURAMENTO TOTAL</span>
          <div className="mt-2">
            <span className="text-xl font-mono font-bold text-white">
              R$ {totalRevenue.toLocaleString('pt-BR')}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Search & Toolbar Strip */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-[#141414] border border-neutral-900 p-4 rounded-2xl">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
          {/* Search box */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-neutral-500" />
            <input
              type="text"
              placeholder="Buscar cliente, e-mail, telefone ou ensaio..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#0d0d0d] text-xs text-white pl-10 pr-4 py-2.5 rounded-xl border border-neutral-800 focus:border-[#E85E26]/60 focus:outline-none focus:ring-1 focus:ring-[#E85E26]/25 transition-all font-sans"
            />
          </div>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#0d0d0d] text-xs text-neutral-300 px-3.5 py-2.5 rounded-xl border border-neutral-800 focus:outline-none focus:border-[#E85E26]/50 cursor-pointer font-sans"
          >
            <option value="all">Todas as Fases</option>
            <option value="uploaded">Provas Carregadas</option>
            <option value="reviewing">Em Revisão</option>
            <option value="approved">Seleção Aprovada</option>
            <option value="editing">Em Edição</option>
            <option value="delivered">Entregue</option>
          </select>

          {/* Extras toggle */}
          <label className="flex items-center gap-2 bg-[#0d0d0d] px-3.5 py-2.5 rounded-xl border border-neutral-800 text-xs text-neutral-300 cursor-pointer hover:border-neutral-700 transition-colors">
            <input
              type="checkbox"
              checked={onlyExtras}
              onChange={(e) => setOnlyExtras(e.target.checked)}
              className="accent-[#E85E26] rounded cursor-pointer"
            />
            <span className="font-mono text-[11px]">Apenas fotos extras</span>
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={handleExportCSV}
            className="bg-[#121212] hover:bg-[#1a1a1a] text-neutral-200 hover:text-white border border-neutral-800 font-mono text-xs uppercase tracking-wider font-semibold px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-sm"
            title="Exportar planilha consolidada em formato CSV para Excel/Sheets"
          >
            <Download className="w-3.5 h-3.5 text-[#E85E26]" /> Exportar CSV
          </button>
        </div>
      </div>

      {/* 3. Database Table View */}
      <div className="bg-[#121212] border border-neutral-900 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-neutral-850 bg-[#0e0e0e] text-[10px] font-mono uppercase tracking-widest text-neutral-500">
                <th className="py-3.5 px-4 font-bold">Cliente / Contato</th>
                <th className="py-3.5 px-4 font-bold">Ensaio / Conceito</th>
                <th className="py-3.5 px-4 font-bold">Fase</th>
                <th className="py-3.5 px-4 font-bold text-center">Contratadas</th>
                <th className="py-3.5 px-4 font-bold text-center">Selecionadas</th>
                <th className="py-3.5 px-4 font-bold text-center">Extras</th>
                <th className="py-3.5 px-4 font-bold">Orçamento Total</th>
                <th className="py-3.5 px-4 font-bold">Pastas Google Drive</th>
                <th className="py-3.5 px-4 font-bold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-900 text-xs">
              {filteredProjects.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-neutral-600 font-mono">
                    Nenhum cliente ou ensaio encontrado com os filtros aplicados.
                  </td>
                </tr>
              ) : (
                filteredProjects.map((project) => {
                  const contracted = project.contractedCount || 10;
                  const bonus = project.bonusPhotosCount || 0;
                  const freeThreshold = contracted + bonus;
                  const selected = project.selectedCount || 0;
                  const extras = Math.max(0, selected - freeThreshold);
                  const extraPrice = project.extraPhotoPrice !== undefined ? project.extraPhotoPrice : 75;
                  const extrasCost = extras * extraPrice;
                  const grandTotal = (project.priceEstimate || 0) + extrasCost;

                  return (
                    <tr 
                      key={project.id}
                      className="hover:bg-[#161616] transition-colors group"
                    >
                      {/* Cliente */}
                      <td className="py-4 px-4">
                        <div className="font-bold text-white group-hover:text-[#E85E26] transition-colors flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-neutral-500" />
                          <span>{project.clientName}</span>
                        </div>
                        <div className="text-[11px] text-neutral-400 flex items-center gap-1.5 mt-0.5">
                          <Mail className="w-3 h-3 text-neutral-600" />
                          <span>{project.clientEmail}</span>
                        </div>
                        {project.clientPhone && (
                          <div className="text-[10px] text-neutral-500 flex items-center gap-1 mt-0.5 font-mono">
                            <Phone className="w-2.5 h-2.5 text-neutral-600" />
                            <span>{project.clientPhone}</span>
                          </div>
                        )}
                      </td>

                      {/* Ensaio */}
                      <td className="py-4 px-4 max-w-[200px]">
                        <div className="font-semibold text-neutral-200 truncate" title={project.projectName}>
                          {project.projectName}
                        </div>
                        <div className="text-[10px] text-neutral-500 font-mono flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3 text-neutral-600" />
                          <span>{project.deliveryEstimate ? new Date(project.deliveryEstimate).toLocaleDateString('pt-BR') : 'Sem data definida'}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4">
                        <select
                          value={project.status}
                          onChange={(e) => onUpdateStatus(project.id, e.target.value as any)}
                          className="bg-[#0b0b0b] text-[11px] font-mono font-semibold text-neutral-200 px-2.5 py-1.5 rounded-lg border border-neutral-800 focus:outline-none focus:border-[#E85E26] cursor-pointer"
                        >
                          <option value="uploaded">Provas Carregadas</option>
                          <option value="reviewing">Em Revisão</option>
                          <option value="approved">Seleção Aprovada</option>
                          <option value="editing">Em Edição</option>
                          <option value="partial_delivered">⚡ Entrega Parcial</option>
                          <option value="delivered">🎉 Final Entregue</option>
                        </select>
                      </td>

                      {/* Contratadas */}
                      <td className="py-4 px-4 text-center font-mono">
                        <span className="text-neutral-300 font-bold">{contracted}</span>
                        {bonus > 0 && (
                          <span className="text-[9px] text-[#ff7236] bg-orange-500/10 px-1.5 py-0.5 rounded border border-orange-500/20 block mt-0.5 font-bold">
                            🎁 +{bonus}
                          </span>
                        )}
                        <span className="text-[10px] text-neutral-600 block">fotos</span>
                      </td>

                      {/* Selecionadas */}
                      <td className="py-4 px-4 text-center">
                        <div className="font-mono font-bold text-white">
                          <span className={selected > 0 ? 'text-emerald-400' : 'text-neutral-400'}>
                            {selected}
                          </span>
                          <span className="text-neutral-600 text-[10px]"> / {project.totalCount || 0}</span>
                        </div>
                        {/* Mini progress bar */}
                        <div className="w-16 h-1 bg-neutral-800 rounded-full mx-auto mt-1 overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${selected > contracted ? 'bg-[#E85E26]' : 'bg-emerald-500'}`}
                            style={{ width: `${Math.min(100, (selected / (project.totalCount || 1)) * 100)}%` }}
                          />
                        </div>
                      </td>

                      {/* Extras */}
                      <td className="py-4 px-4 text-center font-mono">
                        {extras > 0 ? (
                          <div>
                            <span className="text-xs font-bold text-[#E85E26] bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-500/20">
                              +{extras} fotos
                            </span>
                            <span className="text-[10px] text-neutral-400 block mt-0.5">
                              +R$ {extrasCost.toLocaleString('pt-BR')}
                            </span>
                          </div>
                        ) : (
                          <span className="text-neutral-600 text-[11px]">-</span>
                        )}
                      </td>

                      {/* Orçamento Total */}
                      <td className="py-4 px-4 font-mono">
                        <div className="font-bold text-white text-sm">
                          R$ {grandTotal.toLocaleString('pt-BR')}
                        </div>
                        <div className="text-[10px] text-neutral-500 leading-tight">
                          Base: R$ {(project.priceEstimate || 0).toLocaleString('pt-BR')}
                        </div>
                      </td>

                      {/* Pastas Google Drive */}
                      <td className="py-4 px-4">
                        <div className="flex flex-col gap-1 text-[11px] font-mono">
                          {/* 1. Raw */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] uppercase px-1.5 py-0.2 bg-neutral-800 text-neutral-400 rounded">Brutas</span>
                            {project.driveFolderId ? (
                              <a
                                href={getDriveFolderUrl(project.driveFolderId)}
                                target="_blank"
                                rel="noreferrer"
                                className="text-neutral-300 hover:text-[#E85E26] flex items-center gap-1 truncate max-w-[120px]"
                                title="Abrir pasta de provas no Google Drive"
                              >
                                <span className="truncate">{project.driveFolderId.slice(0, 10)}...</span>
                                <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                              </a>
                            ) : (
                              <span className="text-neutral-600">Não configurada</span>
                            )}
                          </div>

                          {/* 2. Selected */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] uppercase px-1.5 py-0.2 bg-emerald-950 text-emerald-400 rounded border border-emerald-900/60">Seleção</span>
                            {project.selectedDriveFolderId ? (
                              <a
                                href={getDriveFolderUrl(project.selectedDriveFolderId)}
                                target="_blank"
                                rel="noreferrer"
                                className="text-emerald-400 hover:underline flex items-center gap-1 truncate max-w-[120px]"
                                title="Abrir pasta de selecionadas no Google Drive"
                              >
                                <span className="truncate">{project.selectedDriveFolderId.slice(0, 10)}...</span>
                                <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                              </a>
                            ) : (
                              <button
                                onClick={() => handleOpenEditFolders(project)}
                                className="text-[10px] text-neutral-500 hover:text-emerald-400 underline cursor-pointer"
                              >
                                + Adicionar pasta
                              </button>
                            )}
                          </div>

                          {/* 3. Final Delivered */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] uppercase px-1.5 py-0.2 bg-sky-950 text-sky-400 rounded border border-sky-900/60">Entrega</span>
                            {project.deliveredDriveFolderId ? (
                              <a
                                href={getDriveFolderUrl(project.deliveredDriveFolderId)}
                                target="_blank"
                                rel="noreferrer"
                                className="text-sky-400 hover:underline flex items-center gap-1 truncate max-w-[120px]"
                                title="Abrir pasta de entrega final no Google Drive"
                              >
                                <span className="truncate">{project.deliveredDriveFolderId.slice(0, 10)}...</span>
                                <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                              </a>
                            ) : (
                              <button
                                onClick={() => handleOpenEditFolders(project)}
                                className="text-[10px] text-neutral-500 hover:text-sky-400 underline cursor-pointer"
                              >
                                + Adicionar pasta
                              </button>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Ações */}
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenClientDetail(project)}
                            className="p-2 bg-[#181818] hover:bg-[#E85E26] hover:text-black text-neutral-300 rounded-xl transition-all cursor-pointer border border-neutral-800"
                            title="Ver fotos selecionadas deste cliente e observações de retoque"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleOpenEditFolders(project)}
                            className="p-2 bg-[#181818] hover:bg-neutral-800 text-neutral-400 hover:text-white rounded-xl transition-all cursor-pointer border border-neutral-800"
                            title="Configurar Pastas do Drive (Provas, Seleção, Entrega)"
                          >
                            <Folder className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => onSelectProject(project.id)}
                            className="bg-[#181818] hover:bg-neutral-800 border border-neutral-800 text-[11px] font-mono uppercase tracking-wider text-neutral-300 px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                            title="Abrir painel completo do ensaio"
                          >
                            <span>Abrir</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. MODAL: DETAILED CLIENT SELECTIONS & DRIVE COPY */}
      {selectedProjectForDetail && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-4xl bg-[#121212] border border-neutral-800 rounded-3xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-neutral-900 bg-gradient-to-r from-orange-500/10 to-transparent flex items-start justify-between gap-4">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#E85E26] font-bold">
                  BASE DE DADOS DO CLIENTE • DETALHES DE SELEÇÃO
                </span>
                <h3 className="text-xl font-bold text-white mt-1">
                  {selectedProjectForDetail.clientName} — {selectedProjectForDetail.projectName}
                </h3>
                <p className="text-xs text-neutral-400 mt-1 flex items-center gap-3 font-mono">
                  <span>Email: {selectedProjectForDetail.clientEmail}</span>
                  {selectedProjectForDetail.clientPhone && <span>Tel: {selectedProjectForDetail.clientPhone}</span>}
                </p>
              </div>

              <button
                onClick={() => setSelectedProjectForDetail(null)}
                className="p-2 text-neutral-500 hover:text-white rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Actions Bar */}
            <div className="p-4 bg-[#181818] border-b border-neutral-900 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-neutral-300">
                  Total Selecionado: <strong className="text-emerald-400 font-bold">{detailedProofs.filter(p => p.isSelected).length}</strong> de {detailedProofs.length} fotos
                </span>
                {detailedProofs.filter(p => p.isSelected).length > (selectedProjectForDetail.contractedCount || 10) && (
                  <span className="text-[11px] font-mono text-[#E85E26] bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-500/20">
                    +{detailedProofs.filter(p => p.isSelected).length - (selectedProjectForDetail.contractedCount || 10)} extras
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                {/* Copy to Lightroom button */}
                <button
                  onClick={() => handleCopyLightroomList(detailedProofs, 'detail_modal')}
                  className="bg-[#242424] hover:bg-neutral-700 text-neutral-200 text-xs font-mono uppercase tracking-wider px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 border border-neutral-700 cursor-pointer"
                  title="Copia os nomes de arquivos selecionados separados por vírgula para colar no filtro do Lightroom ou Bridge"
                >
                  {copiedId === 'detail_modal' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copiado para o Lightroom!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-[#E85E26]" />
                      <span>Copiar Nomes p/ Lightroom</span>
                    </>
                  )}
                </button>

                {/* Direct to Google Drive button */}
                <button
                  onClick={() => handleCopySelectedToDrive(selectedProjectForDetail, detailedProofs)}
                  disabled={isDriveCopying}
                  className="bg-[#E85E26] hover:bg-[#ff7236] text-white text-xs font-mono uppercase tracking-wider font-bold px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                  title="Copia os arquivos selecionados para a pasta de fotos selecionadas no Google Drive"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isDriveCopying ? 'animate-spin' : ''}`} />
                  <span>{isDriveCopying ? 'Copiando no Drive...' : 'Direcionar Selecionadas p/ o Drive'}</span>
                </button>
              </div>
            </div>

            {/* Drive Copy Progress & Alert */}
            {driveCopyProgress && (
              <div className="px-6 py-2.5 bg-orange-500/10 border-b border-orange-500/20 text-[#E85E26] text-xs font-mono flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>{driveCopyProgress}</span>
              </div>
            )}

            {driveCopyResult && (
              <div className="px-6 py-2.5 bg-emerald-500/10 border-b border-emerald-500/20 text-emerald-400 text-xs font-mono flex items-center justify-between">
                <span>
                  Sucesso! {driveCopyResult.success} fotos copiadas com sucesso para a pasta de selecionadas do Drive.
                  {driveCopyResult.failed > 0 && ` (${driveCopyResult.failed} falharam)`}
                </span>
                {selectedProjectForDetail.selectedDriveFolderId && (
                  <a
                    href={getDriveFolderUrl(selectedProjectForDetail.selectedDriveFolderId)}
                    target="_blank"
                    rel="noreferrer"
                    className="underline text-emerald-300 font-bold ml-2"
                  >
                    Abrir Pasta no Drive
                  </a>
                )}
              </div>
            )}

            {/* Content List */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {loadingProofs ? (
                <div className="py-16 text-center text-neutral-500 font-mono text-xs flex flex-col items-center justify-center gap-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-[#E85E26]" />
                  <span>Carregando provas e notas do cliente...</span>
                </div>
              ) : detailedProofs.length === 0 ? (
                <div className="py-16 text-center text-neutral-600 font-mono text-xs">
                  Nenhuma foto carregada para este ensaio.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {detailedProofs.map((proof) => {
                    return (
                      <div
                        key={proof.id}
                        className={`p-3.5 rounded-2xl border transition-all flex items-start gap-3.5 ${
                          proof.isSelected 
                            ? 'bg-[#181818] border-emerald-500/40 ring-1 ring-emerald-500/20' 
                            : 'bg-[#141414] border-neutral-850 opacity-60'
                        }`}
                      >
                        {/* Thumbnail */}
                        <div className="w-20 h-20 rounded-xl overflow-hidden bg-neutral-900 shrink-0 relative">
                          <img
                            src={proof.thumbnailUrl}
                            alt={proof.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                          {proof.isSelected && (
                            <span className="absolute top-1 right-1 bg-emerald-500 text-black p-0.5 rounded-full shadow">
                              <Check className="w-3 h-3 stroke-[3]" />
                            </span>
                          )}
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-xs font-bold text-white truncate" title={proof.name}>
                              {proof.name}
                            </span>
                            <span className={`text-[9px] font-mono uppercase px-2 py-0.5 rounded-full font-bold ${
                              proof.isSelected 
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/80' 
                                : 'bg-neutral-800 text-neutral-500'
                            }`}>
                              {proof.isSelected ? 'Aprovada' : 'Pendente'}
                            </span>
                          </div>

                          {/* Client notes if any */}
                          {proof.clientNotes ? (
                            <div className="mt-2 p-2 bg-[#0d0d0d] rounded-xl border border-neutral-800 text-[11px] text-neutral-300 italic">
                              <span className="text-[9px] text-[#E85E26] font-mono not-italic block uppercase font-bold">
                                Observação do Cliente:
                              </span>
                              "{proof.clientNotes}"
                            </div>
                          ) : (
                            <p className="text-[10px] text-neutral-600 mt-2 italic">
                              Sem observações de retoque específicas.
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-neutral-900 bg-[#0e0e0e] flex items-center justify-between">
              <span className="text-[11px] text-neutral-500 font-mono">
                Total de fotos no ensaio: {detailedProofs.length}
              </span>
              <button
                onClick={() => setSelectedProjectForDetail(null)}
                className="bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-mono uppercase tracking-wider px-5 py-2.5 rounded-xl transition-colors"
              >
                Fechar Detalhes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. MODAL: EDIT GOOGLE DRIVE FOLDERS */}
      {editingFolderProj && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#141414] border border-neutral-800 rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-neutral-900 pb-4">
              <div className="flex items-center gap-2">
                <Folder className="w-5 h-5 text-[#E85E26]" />
                <h3 className="text-base font-bold text-white">Configurar Pastas do Google Drive</h3>
              </div>
              <button
                onClick={() => setEditingFolderProj(null)}
                className="text-neutral-500 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-neutral-400 leading-relaxed">
              Configure os links ou códigos das pastas do Google Drive para o ensaio <strong>{editingFolderProj.projectName}</strong> ({editingFolderProj.clientName}).
            </p>

            <div className="space-y-4">
              {/* 1. Raw / Proofs */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono uppercase tracking-wider text-neutral-300 font-medium">
                  1. Pasta de Provas / Brutas (Para o cliente selecionar) *
                </label>
                <input
                  type="text"
                  value={rawFolderInput}
                  onChange={(e) => setRawFolderInput(e.target.value)}
                  placeholder="Link ou ID da pasta de provas..."
                  className="w-full bg-[#0c0c0c] text-xs text-white p-3 rounded-xl border border-neutral-800 focus:border-[#E85E26] focus:outline-none font-mono"
                />
              </div>

              {/* 2. Selected */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-medium">
                  2. Pasta para Fotos Selecionadas (Destino de cópia)
                </label>
                <input
                  type="text"
                  value={selectedFolderInput}
                  onChange={(e) => setSelectedFolderInput(e.target.value)}
                  placeholder="Link ou ID da pasta de selecionadas..."
                  className="w-full bg-[#0c0c0c] text-xs text-white p-3 rounded-xl border border-neutral-800 focus:border-emerald-500 focus:outline-none font-mono"
                />
                <p className="text-[10px] text-neutral-500">
                  Para onde as fotos aprovadas serão copiadas pelo botão "Direcionar Selecionadas".
                </p>
              </div>

              {/* 3. Delivered */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono uppercase tracking-wider text-sky-400 font-medium">
                  3. Pasta para Entrega dos Arquivos Finalizados
                </label>
                <input
                  type="text"
                  value={deliveredFolderInput}
                  onChange={(e) => setDeliveredFolderInput(e.target.value)}
                  placeholder="Link ou ID da pasta de entrega final..."
                  className="w-full bg-[#0c0c0c] text-xs text-white p-3 rounded-xl border border-neutral-800 focus:border-sky-500 focus:outline-none font-mono"
                />
                <p className="text-[10px] text-neutral-500">
                  O cliente terá acesso direto a esta pasta para baixar os arquivos em alta resolução.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-900">
              <button
                onClick={() => setEditingFolderProj(null)}
                className="px-4 py-2.5 text-xs font-mono uppercase text-neutral-400 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveFolders}
                disabled={savingFolders}
                className="bg-[#E85E26] hover:bg-[#ff7236] text-white font-bold text-xs font-mono uppercase tracking-wider px-5 py-2.5 rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {savingFolders ? 'Salvando...' : 'Salvar Pastas'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
