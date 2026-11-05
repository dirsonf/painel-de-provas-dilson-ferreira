/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Calendar, Plus, Compass, DollarSign, Phone, Mail, Sparkles, Folder, Star } from 'lucide-react';
import { DEFAULT_FOLDER_ID, extractDriveFolderId } from '../lib/drive';

interface CreateProjectModalProps {
  onClose: () => void;
  onCreate: (projectData: {
    clientName: string;
    clientEmail: string;
    clientPhone: string;
    projectName: string;
    driveFolderId: string;
    selectedDriveFolderId?: string;
    deliveredDriveFolderId?: string;
    deliveryEstimate: string;
    priceEstimate: number;
    contractedCount: number;
    bonusPhotosCount?: number;
    extraPhotoPrice: number;
    adminNotes: string;
    googleReviewUrl?: string;
  }) => void;
}

const PACKAGES = [
  { id: 'retrato_basico_degustacao', name: 'Retrato Básico - Degustação (R$ 500 | 3f)', price: 500, contracted: 3, extraPrice: 75, notes: 'Degustação Retrato Básico. 45min duração, 1 troca de figurino, iluminação flash (concha), 1 fundo sólido.' },
  { id: 'retrato_basico_padrao', name: 'Retrato Básico - Padrão (R$ 1.200 | 6f)', price: 1200, contracted: 6, extraPrice: 60, notes: 'Padrão Retrato Básico. 2h duração, 3 trocas de figurino, iluminação flash (3 pontos), 3 fundos diversos.' },
  { id: 'retrato_basico_completo', name: 'Retrato Básico - Completo (R$ 2.100 | 15f)', price: 2100, contracted: 15, extraPrice: 45, notes: 'Completo Retrato Básico. 4h duração, trocas de figurino ilimitadas, iluminação flash personalizada, fundos ilimitados, direção de arte.' },
  { id: 'retrato_conceito_degustacao', name: 'Retrato Conceito - Degustação (R$ 800 | 3f)', price: 800, contracted: 3, extraPrice: 125, notes: 'Degustação Retrato Conceito. 45min duração, 1 troca de figurino, iluminação dramática, efeitos práticos, cenografia.' },
  { id: 'retrato_conceito_padrao', name: 'Retrato Conceito - Padrão (R$ 1.900 | 12f)', price: 1900, contracted: 12, extraPrice: 100, notes: 'Padrão Retrato Conceito. 2h duração, 3 trocas de figurino, equipamento de cinema, cenografia avançada.' },
  { id: 'retrato_conceito_completo', name: 'Retrato Conceito - Completo (R$ 2.900 | 24f)', price: 2900, contracted: 24, extraPrice: 75, notes: 'Completo Retrato Conceito. 4h duração, trocas a definir, cenário completo, efeitos a definir.' },
  { id: 'locacao_ensaio', name: 'Locação & Cobertura - Ensaio Locação (R$ 1.600 | 30f)', price: 1600, contracted: 30, extraPrice: 75, notes: 'Ensaio Locação. 2h duração, 1 troca de locação, luz natural + flash/led portátil.' },
  { id: 'locacao_cobertura', name: 'Locação & Cobertura - Cobertura (R$ 2.600 | 100f)', price: 2600, contracted: 100, extraPrice: 75, notes: 'Cobertura. Até 6h total. Trajeto, hotel/estúdio, passagem de som, apresentação, pós-evento. Mais de 100 fotos editadas.' },
  { id: 'locacao_turne', name: 'Locação & Cobertura - Turnê Completa (R$ 3.800 | 130f)', price: 3800, contracted: 130, extraPrice: 75, notes: 'Turnê Completa. Ensaio Locação (30 fotos) + Cobertura (+100 fotos).' },
  { id: 'combo_artista', name: 'Combo - Pacote Artista (R$ 1.615 | 9f - 10% OFF)', price: 1615, contracted: 9, extraPrice: 75, notes: 'Combo Artista. Ideal para renovar portfólio com variedade. Inclui: 6 fotos Retrato Básico + 3 fotos Retrato Conceito, 4 trocas de figurino, 3h de duração (mesmo dia), luz mista.' },
  { id: 'combo_influenciador', name: 'Combo - Vida de Influenciador (R$ 1.785 | 33f - 10% OFF)', price: 1785, contracted: 33, extraPrice: 75, notes: 'Combo Vida de Influenciador. Perfeito para conteúdo autêntico e diário. Inclui: 30 fotos Ensaio Locação + 3 fotos Retrato Básico, 3 trocas de figurino, 2.5h totais, locação externa.' },
  { id: 'combo_criador', name: 'Combo - Criador de Conteúdo (R$ 1.955 | 33f - 10% OFF)', price: 1955, contracted: 33, extraPrice: 75, notes: 'Combo Criador de Conteúdo. Equilíbrio entre arte e estilo de vida. Inclui: 3 fotos Retrato Conceito + 30 fotos Ensaio Locação, 3 trocas de figurino, 3h totais, mix estúdio/rua.' },
  { id: 'avatar_captura', name: 'Avatar Generativo - Captura (R$ 400 | 10f)', price: 400, contracted: 10, extraPrice: 75, notes: 'Avatar Generativo: Captura e Sessão Técnica. Fotos biométricas, treinamento de LoRA, arquivos base.' },
  { id: 'avatar_completo', name: 'Avatar Generativo - Pacote Completo (R$ 1.800 | 30f)', price: 1800, contracted: 30, extraPrice: 75, notes: 'Avatar Generativo: Pacote Completo (Mais Vendido). Sessão de captura, 30 artes geradas em alta resolução, 3 cenários distintos.' },
  { id: 'avatar_banco', name: 'Avatar Generativo - Banco Digital (R$ 3.500 | 50f)', price: 3500, contracted: 50, extraPrice: 75, notes: 'Avatar Generativo: Banco Digital. Volume Máximo, 50+ artes geradas, diversidade de estilos, uso comercial a definir.' },
  { id: 'aluguel_estudio', name: 'Aluguel de Estúdio (R$ 350 / hora)', price: 350, contracted: 1, extraPrice: 0, notes: 'Aluguel de Estúdio de Fotografia. Incluso assistência de iluminação (indispensável). Equipamento: 2x Amaran 300W RGB, 2x Godox AD600 Pro, monitor 27" 4K DP/HDMI, ar condicionado.' }
];

export default function CreateProjectModal({ onClose, onCreate }: CreateProjectModalProps) {
  const [selectedPackageId, setSelectedPackageId] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [projectName, setProjectName] = useState('');
  const [driveFolderId, setDriveFolderId] = useState('1CJ1JbADGfckjfysH6DK75-8Gau-9YGF6');
  const [selectedDriveFolderId, setSelectedDriveFolderId] = useState('');
  const [deliveredDriveFolderId, setDeliveredDriveFolderId] = useState('');
  const [deliveryEstimate, setDeliveryEstimate] = useState('');
  const [priceEstimate, setPriceEstimate] = useState(1200);
  const [contractedCount, setContractedCount] = useState(10);
  const [bonusPhotosCount, setBonusPhotosCount] = useState(0);
  const [extraPhotoPrice, setExtraPhotoPrice] = useState(75);
  const [adminNotes, setAdminNotes] = useState('');
  const [googleReviewUrl, setGoogleReviewUrl] = useState('');
  const [errorMess, setErrorMess] = useState('');

  const handleSelectPackage = (packageId: string) => {
    setSelectedPackageId(packageId);
    if (!packageId) return;
    const pkg = PACKAGES.find(p => p.id === packageId);
    if (pkg) {
      setPriceEstimate(pkg.price);
      setContractedCount(pkg.contracted);
      setExtraPhotoPrice(pkg.extraPrice);
      setAdminNotes(pkg.notes);
      
      // Auto pre-fill project name if empty or generic
      if (!projectName || projectName.startsWith('Retrato') || projectName.startsWith('Combo') || projectName.startsWith('Avatar') || projectName.startsWith('Locação')) {
        const dateStr = new Date().toLocaleDateString('pt-BR', { month: '2-digit', year: '2-digit' });
        const nameSuffix = clientName ? ` - ${clientName}` : '';
        setProjectName(`${pkg.name.split(' (')[0]}${nameSuffix} (${dateStr})`);
      }
    }
  };

  const handleClientNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setClientName(val);
    
    // Auto update project name if set using preset
    if (selectedPackageId) {
      const pkg = PACKAGES.find(p => p.id === selectedPackageId);
      if (pkg) {
        const dateStr = new Date().toLocaleDateString('pt-BR', { month: '2-digit', year: '2-digit' });
        const nameSuffix = val ? ` - ${val}` : '';
        setProjectName(`${pkg.name.split(' (')[0]}${nameSuffix} (${dateStr})`);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName || !clientEmail || !projectName || !driveFolderId) {
      setErrorMess('Por favor, preencha todos os campos obrigatórios (*)');
      return;
    }
    setErrorMess('');
    onCreate({
      clientName,
      clientEmail: clientEmail.trim().toLowerCase(),
      clientPhone,
      projectName,
      driveFolderId: extractDriveFolderId(driveFolderId),
      selectedDriveFolderId: selectedDriveFolderId.trim() ? extractDriveFolderId(selectedDriveFolderId) : '',
      deliveredDriveFolderId: deliveredDriveFolderId.trim() ? extractDriveFolderId(deliveredDriveFolderId) : '',
      deliveryEstimate,
      priceEstimate: Number(priceEstimate) || 0,
      contractedCount: Number(contractedCount) || 10,
      bonusPhotosCount: Number(bonusPhotosCount) || 0,
      extraPhotoPrice: Number(extraPhotoPrice) || 75,
      adminNotes,
      googleReviewUrl: googleReviewUrl.trim()
    });
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-[#121212] border border-neutral-800 rounded-3xl overflow-hidden shadow-2xl relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-neutral-500 hover:text-white rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="p-6 border-b border-neutral-900 bg-gradient-to-r from-orange-500/10 to-transparent">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#E85E26]" />
            <h2 className="text-xl font-bold tracking-tight text-white">Criar Novo Projeto Fotográfico</h2>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Cadastre os dados da sessão, ligue o diretório do Drive e estabeleça estimativas de produção.
          </p>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {errorMess && (
            <div className="bg-red-500/10 border border-red-500/35 text-red-400 text-xs py-2.5 px-4 rounded-xl">
              {errorMess}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Package / Service Preset Selector */}
            <div className="flex flex-col gap-1.5 md:col-span-2 bg-orange-600/5 border border-orange-500/10 p-4 rounded-2xl mb-1">
              <label className="text-xs font-mono uppercase tracking-widest text-[#E85E26] font-bold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#E85E26]" /> Carregar Configuração do PDF (Serviço Presets)
              </label>
              <select
                value={selectedPackageId}
                onChange={(e) => handleSelectPackage(e.target.value)}
                className="w-full bg-[#181818] text-sm text-white px-4 py-2.5 rounded-xl border border-neutral-800 focus:border-[#E85E26]/60 focus:outline-none focus:ring-1 focus:ring-[#E85E26]/30 transition-all font-sans cursor-pointer"
              >
                <option value="">-- Escolha um serviço/pacote predefinido --</option>
                <optgroup label="Retrato Básico (Fundo Sólido • Essencial)">
                  {PACKAGES.filter(p => p.id.startsWith('retrato_basico')).map(pkg => (
                    <option key={pkg.id} value={pkg.id}>{pkg.name}</option>
                  ))}
                </optgroup>
                <optgroup label="Retrato Conceito (Cenografia • Efeitos • Arte)">
                  {PACKAGES.filter(p => p.id.startsWith('retrato_conceito')).map(pkg => (
                    <option key={pkg.id} value={pkg.id}>{pkg.name}</option>
                  ))}
                </optgroup>
                <optgroup label="Locação & Cobertura">
                  {PACKAGES.filter(p => p.id.startsWith('locacao_')).map(pkg => (
                    <option key={pkg.id} value={pkg.id}>{pkg.name}</option>
                  ))}
                </optgroup>
                <optgroup label="Combos com 10% de Desconto">
                  {PACKAGES.filter(p => p.id.startsWith('combo_')).map(pkg => (
                    <option key={pkg.id} value={pkg.id}>{pkg.name}</option>
                  ))}
                </optgroup>
                <optgroup label="Avatar Generativo">
                  {PACKAGES.filter(p => p.id.startsWith('avatar_')).map(pkg => (
                    <option key={pkg.id} value={pkg.id}>{pkg.name}</option>
                  ))}
                </optgroup>
                <optgroup label="Aluguel de Estúdio">
                  {PACKAGES.filter(p => p.id === 'aluguel_estudio').map(pkg => (
                    <option key={pkg.id} value={pkg.id}>{pkg.name}</option>
                  ))}
                </optgroup>
              </select>
              <p className="text-[10px] text-neutral-500 leading-normal">
                Ao selecionar um pacote, o Nome, Orçamento, Fotos Contratadas e Notas Administrativas serão preenchidos automaticamente conforme as tabelas oficiais do PDF de Retratos 2026.
              </p>
            </div>

            {/* Project Concept */}
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="text-xs font-mono uppercase tracking-widest text-neutral-400 font-medium">
                Nome do Projeto / Sessão *
              </label>
              <div className="relative">
                <Compass className="absolute left-3.5 top-3 w-4 h-4 text-neutral-500" />
                <input
                  type="text"
                  required
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Ex: Retrato Básico - Padrão - Juliana Martins"
                  className="w-full bg-[#181818] text-sm text-white pl-10 pr-4 py-2.5 rounded-xl border border-neutral-800 focus:border-[#E85E26]/60 focus:outline-none focus:ring-1 focus:ring-[#E85E26]/30 transition-all font-sans"
                />
              </div>
            </div>

            {/* Client Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-mono uppercase tracking-widest text-neutral-400 font-medium">
                Nome Completo do Cliente *
              </label>
              <input
                type="text"
                required
                value={clientName}
                onChange={handleClientNameChange}
                placeholder="Ex: Juliana Martins"
                className="w-full bg-[#181818] text-sm text-white px-4 py-2.5 rounded-xl border border-neutral-800 focus:border-[#E85E26]/60 focus:outline-none focus:ring-1 focus:ring-[#E85E26]/30 transition-all font-sans"
              />
            </div>

            {/* Client Email */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-mono uppercase tracking-widest text-neutral-400 font-medium">
                E-mail do Cliente (Login Google) *
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 w-4 h-4 text-neutral-500" />
                <input
                  type="email"
                  required
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="Ex: juliana.m@gmail.com"
                  className="w-full bg-[#181818] text-sm text-white pl-10 pr-4 py-2.5 rounded-xl border border-neutral-800 focus:border-amber-500/60 focus:outline-none focus:ring-1 focus:ring-amber-500/30 transition-all font-sans"
                />
              </div>
              <p className="text-[10px] text-neutral-600">Este e-mail deve ser idêntico ao e-mail da conta Google que o cliente usará para aprovar as fotos.</p>
            </div>

            {/* Client Phone */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-mono uppercase tracking-widest text-neutral-400 font-medium">
                WhatsApp / Celular
              </label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-3 w-4 h-4 text-neutral-500" />
                <input
                  type="text"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="Ex: (11) 98765-4321"
                  className="w-full bg-[#181818] text-sm text-white pl-10 pr-4 py-2.5 rounded-xl border border-neutral-800 focus:border-amber-500/60 focus:outline-none focus:ring-1 focus:ring-amber-500/30 transition-all font-sans"
                />
              </div>
            </div>

            {/* Google Drive Integration Section */}
            <div className="md:col-span-2 bg-[#161616] border border-neutral-800/80 p-4 rounded-2xl space-y-4">
              <div className="flex items-center gap-2 border-b border-neutral-850 pb-2">
                <Folder className="w-4 h-4 text-[#E85E26]" />
                <h4 className="text-xs font-mono uppercase tracking-widest text-[#E85E26] font-bold">
                  Integração Google Drive (Pastas do Fluxo)
                </h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. Raw / Proofs Folder */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-300 font-semibold flex items-center gap-1">
                    <span>1. Pasta de Provas (Brutas) *</span>
                  </label>
                  <div className="relative">
                    <Folder className="absolute left-3 top-2.5 w-4 h-4 text-orange-500" />
                    <input
                      type="text"
                      required
                      value={driveFolderId}
                      onChange={(e) => setDriveFolderId(e.target.value)}
                      placeholder="Link ou ID da pasta de provas..."
                      className="w-full bg-[#0e0e0e] text-xs text-white pl-9 pr-3 py-2.5 rounded-xl border border-neutral-700/80 focus:border-[#E85E26] focus:outline-none focus:ring-1 focus:ring-[#E85E26]/30 transition-all font-mono"
                    />
                  </div>
                  <p className="text-[9px] text-neutral-500 leading-tight">
                    Pasta com as fotos brutas para o cliente visualizar e selecionar na galeria.
                  </p>
                </div>

                {/* 2. Selected Photos Folder */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 font-semibold flex items-center gap-1">
                    <span>2. Pasta de Fotos Selecionadas</span>
                  </label>
                  <div className="relative">
                    <Folder className="absolute left-3 top-2.5 w-4 h-4 text-emerald-500" />
                    <input
                      type="text"
                      value={selectedDriveFolderId}
                      onChange={(e) => setSelectedDriveFolderId(e.target.value)}
                      placeholder="Link ou ID da pasta destino..."
                      className="w-full bg-[#0e0e0e] text-xs text-white pl-9 pr-3 py-2.5 rounded-xl border border-neutral-700/80 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 transition-all font-mono"
                    />
                  </div>
                  <p className="text-[9px] text-neutral-500 leading-tight">
                    Para onde as fotos aprovadas pelo cliente serão copiadas e direcionadas.
                  </p>
                </div>

                {/* 3. Final Delivered Photos Folder */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-sky-400 font-semibold flex items-center gap-1">
                    <span>3. Pasta 03 - EDITADAS (Entrega)</span>
                  </label>
                  <div className="relative">
                    <Folder className="absolute left-3 top-2.5 w-4 h-4 text-sky-500" />
                    <input
                      type="text"
                      value={deliveredDriveFolderId}
                      onChange={(e) => setDeliveredDriveFolderId(e.target.value)}
                      placeholder="Link ou ID da pasta 03 - EDITADAS..."
                      className="w-full bg-[#0e0e0e] text-xs text-white pl-9 pr-3 py-2.5 rounded-xl border border-neutral-700/80 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500/30 transition-all font-mono"
                    />
                  </div>
                  <p className="text-[9px] text-neutral-500 leading-tight">
                    Pasta 03 - EDITADAS para entrega parcial ou final dos arquivos de alta resolução.
                  </p>
                </div>
              </div>
            </div>

            {/* Price Estimate */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-mono uppercase tracking-widest text-neutral-400 font-medium">
                Orçamento Estimado (R$)
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3.5 top-3 w-4 h-4 text-neutral-500" />
                <input
                  type="number"
                  value={priceEstimate}
                  onChange={(e) => setPriceEstimate(Number(e.target.value))}
                  placeholder="Ex: 1200"
                  className="w-full bg-[#181818] text-sm text-white pl-10 pr-4 py-2.5 rounded-xl border border-neutral-800 focus:border-[#E85E26]/60 focus:outline-none focus:ring-1 focus:ring-[#E85E26]/30 transition-all font-mono"
                />
              </div>
            </div>

            {/* Contracted Photos */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-mono uppercase tracking-widest text-neutral-400 font-medium">
                Fotos Contratadas (Pacote)
              </label>
              <div className="relative">
                <Folder className="absolute left-3.5 top-3 w-4 h-4 text-neutral-500" />
                <input
                  type="number"
                  min="1"
                  required
                  value={contractedCount}
                  onChange={(e) => setContractedCount(Number(e.target.value))}
                  placeholder="Ex: 10"
                  className="w-full bg-[#181818] text-sm text-white pl-10 pr-4 py-2.5 rounded-xl border border-neutral-800 focus:border-[#E85E26]/60 focus:outline-none focus:ring-1 focus:ring-[#E85E26]/30 transition-all font-mono"
                />
              </div>
            </div>

            {/* Bonus Photos (Brindes) */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-mono uppercase tracking-widest text-[#E85E26] font-semibold flex items-center gap-1">
                <span>Fotos de Brinde / Cortesia 🎁</span>
              </label>
              <div className="relative">
                <Folder className="absolute left-3.5 top-3 w-4 h-4 text-[#E85E26]" />
                <input
                  type="number"
                  min="0"
                  value={bonusPhotosCount}
                  onChange={(e) => setBonusPhotosCount(Number(e.target.value))}
                  placeholder="Ex: 2"
                  className="w-full bg-[#181818] text-sm text-[#E85E26] font-bold pl-10 pr-4 py-2.5 rounded-xl border border-[#E85E26]/40 focus:border-[#E85E26] focus:outline-none focus:ring-1 focus:ring-[#E85E26]/30 transition-all font-mono"
                />
              </div>
            </div>

            {/* Extra Photo Price */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-mono uppercase tracking-widest text-[#E85E26] font-semibold">
                Valor Foto Extra (R$)
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3.5 top-3 w-4 h-4 text-[#E85E26]/70" />
                <input
                  type="number"
                  min="0"
                  required
                  value={extraPhotoPrice}
                  onChange={(e) => setExtraPhotoPrice(Number(e.target.value))}
                  placeholder="Ex: 75"
                  className="w-full bg-[#181818] text-sm text-white pl-10 pr-4 py-2.5 rounded-xl border border-neutral-800 focus:border-[#E85E26]/60 focus:outline-none focus:ring-1 focus:ring-[#E85E26]/30 transition-all font-mono"
                />
              </div>
            </div>

            {/* Delivery Estimate */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-mono uppercase tracking-widest text-neutral-400 font-medium">
                Estimativa de Entrega (Data)
              </label>
              <div className="relative">
                <Calendar className="absolute left-3.5 top-3 w-4 h-4 text-neutral-500" />
                <input
                  type="date"
                  value={deliveryEstimate}
                  onChange={(e) => setDeliveryEstimate(e.target.value)}
                  className="w-full bg-[#181818] text-sm text-white pl-10 pr-4 py-2.5 rounded-xl border border-neutral-800 focus:border-[#E85E26]/60 focus:outline-none focus:ring-1 focus:ring-[#E85E26]/30 transition-all font-sans"
                />
              </div>
            </div>

            {/* Admin Notes */}
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="text-xs font-mono uppercase tracking-widest text-neutral-400 font-medium">
                Notas Administrativas / Detalhes de Produção
              </label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Ex: Pacote Básico Padrão. Feita iluminação flash 3 pontos. 3 trocas de figurino."
                rows={3}
                className="w-full bg-[#181818] text-sm text-neutral-200 border border-neutral-800 rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-[#E85E26]/30 resize-none font-sans"
              />
            </div>

            {/* Google Review Link */}
            <div className="flex flex-col gap-1.5 md:col-span-2 bg-[#181818]/60 border border-neutral-800/80 rounded-2xl p-4">
              <label className="text-xs font-mono uppercase tracking-widest text-amber-400 font-bold flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  Link de Avaliação do Google (Google Meu Negócio)
                </span>
                <span className="text-[10px] text-neutral-500 font-normal">Opcional</span>
              </label>
              <input
                type="text"
                value={googleReviewUrl}
                onChange={(e) => setGoogleReviewUrl(e.target.value)}
                placeholder="Ex: https://g.page/r/.../review ou link de avaliação da sua empresa no Google"
                className="w-full bg-[#121212] text-xs font-mono text-white px-3.5 py-2.5 rounded-xl border border-neutral-800 focus:border-amber-500/80 focus:outline-none transition-all placeholder:text-neutral-600"
              />
              <p className="text-[10px] text-neutral-500">
                O cliente terá um botão direto para avaliar com 5 estrelas na área de entrega das fotos editadas.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-neutral-900 pt-5">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-xs font-mono uppercase tracking-widest text-neutral-400 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="bg-[#E85E26] hover:bg-[#ff7236] text-white font-bold text-xs font-mono uppercase tracking-widest px-6 py-3 rounded-xl transition-all shadow-lg hover:shadow-orange-500/10 flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 text-white stroke-[3]" /> Cadastrar Projeto
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
