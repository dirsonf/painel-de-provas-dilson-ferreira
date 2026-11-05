/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Project } from '../types';
import { 
  Sparkles, Calendar, Clock, DollarSign, Gift, ArrowRight, 
  Check, Copy, MessageCircle, RefreshCw, AlertCircle, Award, CheckCircle2,
  Users, Flame
} from 'lucide-react';
import { getProjectReferralCode } from '../utils/referral';
import VIPCashbackReferralHub from './VIPCashbackReferralHub';

interface ExtraPhotosAndCashbackCardProps {
  project: Project;
  onOpenZoom?: (proof: any) => void;
  isAdmin?: boolean;
  onOpenAdminManager?: () => void;
  className?: string;
}

export default function ExtraPhotosAndCashbackCard({
  project,
  isAdmin = false,
  onOpenAdminManager,
  className = ''
}: ExtraPhotosAndCashbackCardProps) {
  const [extraQuantity, setExtraQuantity] = useState<number>(3);
  const [customPhotoCodes, setCustomPhotoCodes] = useState<string>('');
  const [copiedVoucher, setCopiedVoucher] = useState(false);

  // 1. Calculate session date and 1-year validity window
  const getSessionDate = (): Date => {
    if (project.sessionDate) {
      const d = new Date(project.sessionDate);
      if (!isNaN(d.getTime())) return d;
    }
    if (project.createdAt) {
      if (typeof project.createdAt?.toDate === 'function') {
        return project.createdAt.toDate();
      }
      const d = new Date(project.createdAt);
      if (!isNaN(d.getTime())) return d;
    }
    return new Date();
  };

  const sessionDate = getSessionDate();
  const validityEndDate = new Date(sessionDate);
  validityEndDate.setFullYear(validityEndDate.getFullYear() + 1);

  const now = new Date();
  const diffMs = validityEndDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const diffMonths = Math.max(0, Math.ceil(diffDays / 30));
  const isExpired = diffDays < 0;

  // 2. Pricing and Cashback math
  const extraPhotoPrice = project.extraPhotoPrice !== undefined ? project.extraPhotoPrice : 75;
  const sessionBaseValue = project.sessionValue || project.priceEstimate || 1200;
  const cashbackValue = Math.round(sessionBaseValue * 0.25);
  const totalExtraPrice = extraQuantity * extraPhotoPrice;

  // 3. WhatsApp link builders
  const photographerPhone = '5511999999999'; // Dilson's contact link
  const clientName = project.clientName || 'Cliente';
  const projectName = project.projectName || 'Ensaio Fotográfico';

  const buildExtraPhotosWhatsAppUrl = () => {
    const text = `Olá Dilson! Gostaria de solicitar a edição extra de ${extraQuantity} foto(s) da minha galeria do ensaio "${projectName}".` +
      (customPhotoCodes.trim() ? `\nCódigos das fotos que escolhi: ${customPhotoCodes.trim()}` : '') +
      `\nValor estimado: R$ ${totalExtraPrice.toLocaleString('pt-BR')} (R$ ${extraPhotoPrice}/foto). Como podemos prosseguir?`;
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  };

  const buildCashbackWhatsAppUrl = () => {
    const text = `Olá Dilson! Quero consultar o meu Cashback VIP de 25% (R$ ${cashbackValue.toLocaleString('pt-BR')}) do ensaio "${projectName}" para agendar meu próximo ensaio com você!`;
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  };

  const voucherCode = getProjectReferralCode(project);

  const handleCopyVoucher = () => {
    navigator.clipboard.writeText(
      `VOUCHER CASHBACK 25%: ${voucherCode} - Valor: R$ ${cashbackValue.toLocaleString('pt-BR')} para próximo ensaio de ${clientName} com o fotógrafo Dilson Ferreira.`
    );
    setCopiedVoucher(true);
    setTimeout(() => setCopiedVoucher(false), 2500);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Main Container - Laranja Festivo com Escritos Brancos, Pretos e Verdes */}
      <div className="bg-gradient-to-br from-[#E85E26] via-[#ea580c] to-[#c2410c] border-2 border-orange-300/70 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-2xl shadow-orange-950/60 text-white">
        {/* Subtle orange ambient glow */}
        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-amber-500/5 rounded-full filter blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[240px] h-[240px] bg-[#E85E26]/5 rounded-full filter blur-3xl pointer-events-none" />

        {/* Section Header */}
        <div className="relative z-10 border-b border-white/20 pb-6">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="text-[10px] font-mono tracking-widest text-[#E85E26] font-bold uppercase bg-[#E85E26]/10 border border-[#E85E26]/30 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-[#E85E26]" /> Programa de Continuidade & Edições Extras
            </span>
            <span className="text-[10px] font-mono tracking-widest text-neutral-400 bg-neutral-900 border border-neutral-800 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-amber-400" />
              {isExpired ? 'Prazo de 1 ano finalizado' : `Válido por mais ${diffMonths} ${diffMonths === 1 ? 'mês' : 'meses'} (${diffDays} dias)`}
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Fotos Extras da Galeria & 25% de Cashback para seu Próximo Ensaio
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1.5 max-w-3xl leading-relaxed">
            Sua galeria completa continua arquivada com segurança em nossa nuvem. Você pode solicitar o tratamento fino de fotos adicionais por até 1 ano a partir da data da sua sessão.
          </p>
        </div>

        {/* 2-Column Split: Left = Extra Photos Buy (Up to 1 Year), Right = 25% Cashback Voucher */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-6 relative z-10">
          
          {/* Card 1: Comprar Fotos Extras em até 1 Ano */}
          <div className="bg-[#0b0b0b] text-white border-2 border-black/50 rounded-2xl p-6 flex flex-col justify-between space-y-5 shadow-2xl">
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono font-bold text-amber-500 uppercase tracking-wider block">
                    OPÇÃO 1 • RETOQUES ADICIONAIS
                  </span>
                  <h3 className="text-lg font-bold text-white font-sans">
                    Comprar Edições Extras desta Sessão
                  </h3>
                </div>
                <div className="text-right">
                  <span className="text-xl font-mono font-bold text-white block">
                    R$ {extraPhotoPrice}
                  </span>
                  <span className="text-[10px] font-mono text-neutral-500 block">por foto tratada</span>
                </div>
              </div>

              <div className="bg-[#121212] border border-neutral-850 rounded-xl p-3.5 flex items-center gap-3 text-xs text-neutral-300">
                <Calendar className="w-4 h-4 text-amber-500 shrink-0" />
                <div>
                  <p className="font-semibold text-neutral-200">
                    Janela de Validade de 1 Ano:
                  </p>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    Data do ensaio: <strong>{sessionDate.toLocaleDateString('pt-BR')}</strong> • Pedidos de edições extras desta sessão aceitos até <strong>{validityEndDate.toLocaleDateString('pt-BR')}</strong>.
                  </p>
                </div>
              </div>

              <p className="text-xs text-neutral-400 leading-relaxed">
                Ficou na dúvida com outros cliques lindos da sua galeria? Você pode pedir mais fotos a qualquer momento. Cada foto extra recebe tratamento profissional com calibração estética completa, limpeza e iluminação refinada.
              </p>

              {/* Interactive Quantity Stepper & Calculator */}
              <div className="space-y-3 pt-2">
                <label className="text-[11px] font-mono text-neutral-300 uppercase tracking-wider block font-semibold">
                  Selecione quantas fotos extras você deseja:
                </label>
                
                <div className="flex flex-wrap items-center gap-2">
                  {[1, 2, 3, 5, 10, 15].map((qty) => (
                    <button
                      key={qty}
                      type="button"
                      onClick={() => setExtraQuantity(qty)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                        extraQuantity === qty
                          ? 'bg-[#E85E26] text-white shadow-md shadow-orange-950/40'
                          : 'bg-neutral-900 hover:bg-neutral-850 text-neutral-300 border border-neutral-800'
                      }`}
                    >
                      {qty} {qty === 1 ? 'foto' : 'fotos'}
                    </button>
                  ))}
                </div>

                <div className="space-y-1.5 pt-1">
                  <label className="text-[10px] font-mono text-neutral-400 block">
                    Códigos ou nomes das fotos que você escolheu (opcional):
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: DSC_0142, DSC_0188..."
                    value={customPhotoCodes}
                    onChange={(e) => setCustomPhotoCodes(e.target.value)}
                    className="w-full bg-[#121212] border border-neutral-800 focus:border-[#E85E26] rounded-xl px-3.5 py-2.5 text-xs text-neutral-200 font-mono outline-none placeholder:text-neutral-600"
                  />
                </div>

                {/* Subtotal preview */}
                <div className="bg-[#121212] border border-neutral-800 rounded-xl p-3 flex items-center justify-between">
                  <span className="text-xs text-neutral-400 font-mono">
                    Total ({extraQuantity} fotos x R$ {extraPhotoPrice}):
                  </span>
                  <span className="text-base font-mono font-bold text-amber-400">
                    R$ {totalExtraPrice.toLocaleString('pt-BR')}
                  </span>
                </div>
              </div>
            </div>

            {/* Action button */}
            <div className="pt-2">
              <a
                href={buildExtraPhotosWhatsAppUrl()}
                target="_blank"
                rel="noreferrer"
                className="w-full bg-emerald-400 hover:bg-emerald-300 text-black font-mono font-black text-xs uppercase tracking-wider py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-xl shadow-emerald-950/40 cursor-pointer"
              >
                <MessageCircle className="w-4 h-4 fill-white text-white" />
                <span>Solicitar Edições Extras no WhatsApp</span>
              </a>
            </div>
          </div>

          {/* Card 2: A Regra de 1 Ano & Cashback de 25% para o Próximo Ensaio (Laranja com Escritos Brancos, Pretos e Verdes) */}
          <div className="bg-gradient-to-br from-[#E85E26] via-[#ea580c] to-[#c2410c] border-2 border-orange-300/60 rounded-2xl p-6 flex flex-col justify-between space-y-5 relative text-white shadow-2xl shadow-orange-950/40">
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono font-black text-black bg-emerald-400 px-3 py-1 rounded-full uppercase tracking-wider block w-fit shadow-md">
                    OPÇÃO 2 • RENOVAÇÃO & CASHBACK
                  </span>
                  <h3 className="text-xl font-black text-white font-sans flex items-center gap-2 drop-shadow-sm">
                    <span>Cashback de 25% no Próximo Ensaio</span>
                  </h3>
                </div>
                <div className="p-2.5 bg-black text-emerald-400 border border-black/40 rounded-xl shrink-0 shadow-md">
                  <Award className="w-5 h-5 text-emerald-400" />
                </div>
              </div>

              {/* Informative Rule Callout Box */}
              <div className="bg-black/80 border border-white/20 rounded-xl p-4 space-y-2 text-white">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-400 font-mono uppercase tracking-wider">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Por que o prazo é de 1 ano?</span>
                </div>
                <p className="text-xs text-white/95 leading-relaxed font-medium">
                  Após o período de 1 ano, <strong>o mais indicado é realizar uma nova sessão</strong> para renovar seu momento de vida, seu corte de cabelo, sua imagem pessoal e seu posicionamento profissional atualizado.
                </p>
                <p className="text-xs text-emerald-300 leading-relaxed font-semibold">
                  Por isso, para celebrar nossa parceria e incentivar sua renovação periódica, o seu próximo ensaio tem um <strong>CASHBACK GARANTIDO DE 25%</strong> sobre o valor desta sessão que acabamos de realizar!
                </p>
              </div>

              {/* VIP Cashback Voucher Certificate Box (Inset Obsidian com Escritos Verdes) */}
              <div className="bg-[#0b0b0b] border-2 border-dashed border-white/40 rounded-2xl p-5 space-y-3 relative overflow-hidden text-white shadow-2xl">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase font-black tracking-widest text-emerald-400 flex items-center gap-1.5">
                    <Gift className="w-3.5 h-3.5 text-emerald-400" /> Voucher VIP de Fidelidade
                  </span>
                  <span className="text-[10px] font-mono text-black font-black bg-white px-2 py-0.5 rounded uppercase">
                    Código: {voucherCode}
                  </span>
                </div>

                <div className="flex items-baseline justify-between gap-4 pt-1">
                  <div>
                    <span className="text-xs text-neutral-300 block font-mono">Crédito Garantido para Você:</span>
                    <span className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-emerald-400 drop-shadow-md">
                      R$ {cashbackValue.toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono text-black font-black bg-emerald-400 px-2.5 py-1 rounded-md inline-block shadow-md">
                      25% OFF
                    </span>
                    <span className="text-[10px] text-neutral-400 block mt-1 font-mono font-medium">
                      Base: R$ {sessionBaseValue.toLocaleString('pt-BR')}
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-neutral-300 leading-relaxed border-t border-neutral-800 pt-2.5 font-medium">
                  Válido para agendamento do seu próximo ensaio fotográfico com Dilson Ferreira. Crédito pessoal, intransferível e garantido para sua próxima produção.
                </p>
              </div>
            </div>

            {/* Actions: Copy Voucher & Chat with Dilson */}
            <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={handleCopyVoucher}
                className="w-full sm:w-auto bg-white hover:bg-neutral-200 text-black font-mono font-black text-xs py-3.5 px-4 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md"
              >
                {copiedVoucher ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
                    <span className="text-emerald-700 font-black">Voucher Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-black" />
                    <span>Copiar Voucher</span>
                  </>
                )}
              </button>

              <a
                href={buildCashbackWhatsAppUrl()}
                target="_blank"
                rel="noreferrer"
                className="w-full sm:flex-1 bg-emerald-400 hover:bg-emerald-300 text-black font-mono font-black text-xs uppercase tracking-wider py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-xl shadow-emerald-950/40 cursor-pointer"
              >
                <MessageCircle className="w-4 h-4 fill-black text-black" />
                <span>Garantir Cashback no WhatsApp</span>
              </a>
            </div>
          </div>

        </div>
      </div>

      {/* Clube VIP de Fidelidade & Barra de Progressão Gamificada */}
      <VIPCashbackReferralHub 
        project={project}
        isAdmin={isAdmin}
        onOpenAdminManager={onOpenAdminManager}
      />
    </div>
  );
}
