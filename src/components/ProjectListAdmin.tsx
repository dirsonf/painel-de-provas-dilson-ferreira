/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Project } from '../types';
import { 
  FolderSync, Search, Plus, ExternalLink, Calendar, 
  Trash2, Mail, Phone, DollarSign, Activity, FileText, 
  Edit, ArrowRight, User, CheckCircle, Folder
} from 'lucide-react';
import { getDriveFolderUrl } from '../lib/drive';

interface ProjectListAdminProps {
  projects: Project[];
  onSelectProject: (projectId: string) => void;
  onDeleteProject: (projectId: string) => void;
  onSyncDriveFolder: (projectId: string) => void;
  onOpenCreateModal: () => void;
}

export default function ProjectListAdmin({ 
  projects, 
  onSelectProject, 
  onDeleteProject, 
  onSyncDriveFolder,
  onOpenCreateModal 
}: ProjectListAdminProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredProjects = projects.filter(project => {
    const matchesSearch = 
      project.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.clientEmail.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: Project['status']) => {
    switch (status) {
      case 'uploaded':
        return <span className="text-[10px] bg-sky-950 text-sky-400 border border-sky-800/80 px-2.5 py-1 rounded-full font-mono uppercase tracking-widest font-semibold">Provas Carregadas</span>;
      case 'reviewing':
        return <span className="text-[10px] bg-amber-950 text-amber-500 border border-amber-800/80 px-2.5 py-1 rounded-full font-mono uppercase tracking-widest font-semibold">Em Revisão</span>;
      case 'approved':
        return <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800/80 px-2.5 py-1 rounded-full font-mono uppercase tracking-widest font-semibold">Aprovado pelo Cliente</span>;
      case 'editing':
        return <span className="text-[10px] bg-purple-950 text-purple-400 border border-purple-800/80 px-2.5 py-1 rounded-full font-mono uppercase tracking-widest font-semibold">Em Edição</span>;
      case 'partial_delivered':
        return <span className="text-[10px] bg-amber-950 text-amber-400 border border-amber-800/80 px-2.5 py-1 rounded-full font-mono uppercase tracking-widest font-semibold">Entrega Parcial</span>;
      case 'delivered':
        return <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800/80 px-2.5 py-1 rounded-full font-mono uppercase tracking-widest font-semibold">Entrega Concluída</span>;
      default:
        return null;
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Admin Quick stats / Filter Strip */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-[#141414] border border-neutral-900 rounded-2xl p-4">
        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 w-4 h-4 text-neutral-500" />
            <input 
              type="text"
              placeholder="Buscar por cliente, e-mail ou ensaio..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#0d0d0d] text-xs text-white pl-9 pr-4 py-2.5 rounded-xl border border-neutral-800 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/25 transition-all"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#0d0d0d] text-xs text-neutral-400 px-3.5 py-2.5 rounded-xl border border-neutral-800 focus:outline-none focus:ring-1 focus:ring-amber-500/25 cursor-pointer font-sans"
          >
            <option value="all">Fase: Todas</option>
            <option value="uploaded">Provas Carregadas</option>
            <option value="reviewing">Em Revisão</option>
            <option value="approved">Aprovadas (Aprovação API)</option>
            <option value="editing">Em Edição</option>
            <option value="partial_delivered">Entrega Parcial</option>
            <option value="delivered">Entrega Concluída</option>
          </select>
        </div>

        {/* Action button */}
        <button
          onClick={onOpenCreateModal}
          className="bg-[#E85E26] hover:bg-[#ff7236] text-white font-mono text-xs uppercase tracking-widest font-bold px-5 py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 shrink-0 hover:scale-[1.02]"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" /> Criar Novo Projeto
        </button>
      </div>

      {/* Grid List */}
      {filteredProjects.length === 0 ? (
        <div className="bg-[#141414] border border-neutral-900 rounded-3xl py-16 text-center text-neutral-600 flex flex-col items-center justify-center gap-2">
          <Activity className="w-10 h-10 opacity-30 mb-2" />
          <p className="text-sm font-semibold">Nenhum ensaio fotográfico cadastrado.</p>
          <p className="text-xs max-w-[360px] mx-auto text-neutral-700">Clique em "Criar Novo Projeto" para cadastrar uma nova sessão fotográfica, parametrizar as fotos e ligar o cliente.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredProjects.map((project) => (
            <div 
              key={project.id}
              className="group bg-[#141414] border border-neutral-900/90 rounded-2xl p-5 hover:border-neutral-800 transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <h3 className="text-base font-bold text-white tracking-tight group-hover:text-amber-500 transition-colors">
                      {project.projectName}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-1 text-xs text-neutral-400">
                      <User className="w-3.5 h-3.5 text-neutral-500" />
                      <span>{project.clientName}</span>
                    </div>
                  </div>
                  {getStatusBadge(project.status)}
                </div>

                {project.adminNotes && (
                  <p className="text-xs text-neutral-500 bg-[#0c0c0c] p-2.5 rounded-xl border border-neutral-900 italic line-clamp-2 mb-4 leading-relaxed">
                    "{project.adminNotes}"
                  </p>
                )}

                {/* Specific details */}
                <div className="grid grid-cols-2 gap-4 border-t border-neutral-900/60 pt-4 mb-4">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-600">CLIENTE</span>
                    <span className="text-xs text-neutral-300 font-semibold flex items-center gap-1.5 truncate">
                      <Mail className="w-3.5 h-3.5 text-neutral-500" /> {project.clientEmail}
                    </span>
                  </div>
                  
                  {project.clientPhone && (
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-600">TELEFONE</span>
                      <span className="text-xs text-neutral-300 font-semibold flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-neutral-500" /> {project.clientPhone}
                      </span>
                    </div>
                  )}

                  <div className="flex flex-col gap-0.5 col-span-2 sm:col-span-1">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-600">SELEÇÃO</span>
                    <span className="text-xs font-semibold text-neutral-300">
                      {project.selectedCount} / {project.totalCount || 0} fotos ({project.contractedCount || 10} contratadas{project.bonusPhotosCount ? ` + ${project.bonusPhotosCount} brinde` : ''})
                    </span>
                    {project.selectedCount > ((project.contractedCount || 10) + (project.bonusPhotosCount || 0)) && (
                      <span className="text-[10px] text-[#E85E26] font-mono font-bold">
                        +{project.selectedCount - ((project.contractedCount || 10) + (project.bonusPhotosCount || 0))} extras
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-600">ENTREGA (ESTIMATIVA)</span>
                    <span className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5 font-mono">
                      <Calendar className="w-3.5 h-3.5 text-neutral-500" />
                      {project.deliveryEstimate 
                        ? new Date(project.deliveryEstimate).toLocaleDateString('pt-BR') 
                        : 'Não agendada'}
                    </span>
                  </div>

                  {/* Google Drive Folders Row */}
                  <div className="col-span-2 border-t border-neutral-900/60 pt-3 flex flex-wrap items-center gap-2 text-[10px] font-mono">
                    <span className="text-neutral-500 uppercase font-bold text-[9px]">PASTAS DRIVE:</span>
                    <a
                      href={getDriveFolderUrl(project.driveFolderId)}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2 py-0.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white rounded border border-neutral-800 flex items-center gap-1"
                      title="Pasta de provas brutas"
                    >
                      <Folder className="w-2.5 h-2.5 text-orange-500" />
                      <span>Brutas</span>
                      <ExternalLink className="w-2 h-2 text-neutral-500" />
                    </a>

                    {project.selectedDriveFolderId && (
                      <a
                        href={getDriveFolderUrl(project.selectedDriveFolderId)}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2 py-0.5 bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-400 rounded border border-emerald-900/80 flex items-center gap-1"
                        title="Pasta para direcionamento das fotos selecionadas"
                      >
                        <Folder className="w-2.5 h-2.5 text-emerald-400" />
                        <span>Selecionadas</span>
                        <ExternalLink className="w-2 h-2 text-emerald-500" />
                      </a>
                    )}

                    {project.deliveredDriveFolderId && (
                      <a
                        href={getDriveFolderUrl(project.deliveredDriveFolderId)}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2 py-0.5 bg-sky-950/60 hover:bg-sky-900/80 text-sky-400 rounded border border-sky-900/80 flex items-center gap-1"
                        title="Pasta de entrega finalizada"
                      >
                        <Folder className="w-2.5 h-2.5 text-sky-400" />
                        <span>Entrega Final</span>
                        <ExternalLink className="w-2 h-2 text-sky-500" />
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="flex items-center justify-between border-t border-neutral-900 pt-4 mt-2">
                <div className="flex flex-col gap-1">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[9px] font-mono text-neutral-500">TOTAL</span>
                    <span className="text-base font-mono font-bold text-[#E85E26]">
                      R$ {((project.priceEstimate || 0) + (Math.max(0, (project.selectedCount || 0) - (project.contractedCount || 10)) * (project.extraPhotoPrice !== undefined ? project.extraPhotoPrice : 75))).toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <span className="text-[9px] text-neutral-500 block">
                    Base: R$ {project.priceEstimate?.toLocaleString('pt-BR')} • {project.contractedCount || 10} foto(s) inclusas • Extra: R$ {project.extraPhotoPrice !== undefined ? project.extraPhotoPrice : 75}/foto
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => onSyncDriveFolder(project.id)}
                    className="p-2 bg-[#0c0c0c] border border-neutral-900 text-neutral-400 hover:text-[#E85E26] hover:border-orange-500/20 rounded-xl transition-all"
                    title="Forçar Re-Sincronização Google Drive"
                  >
                    <FolderSync className="w-4 h-4" />
                  </button>

                  <button 
                    onClick={() => onDeleteProject(project.id)}
                    className="p-2 bg-red-950/15 border border-red-900/10 text-red-400 hover:bg-red-900/20 hover:text-red-300 rounded-xl transition-all"
                    title="Excluir Projeto"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <button 
                    onClick={() => onSelectProject(project.id)}
                    className="bg-[#181818] border border-neutral-800 text-xs font-mono font-bold uppercase tracking-widest hover:text-white hover:bg-[#E85E26] hover:border-[#E85E26] px-4 py-2 rounded-xl transition-all flex items-center gap-1.5"
                  >
                    Gerenciar <ArrowRight className="w-3 h-3 stroke-[2.5]" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
