/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Project, ReferralRecord } from '../types';
import { 
  Award, Gift, Sparkles, Check, Copy, MessageCircle, 
  Share2, ArrowRight, CheckCircle2, Lock, Flame, Users, 
  HelpCircle, ChevronRight, TrendingUp, DollarSign, Calendar
} from 'lucide-react';
import { 
  getProjectReferralCode, 
  calculateReferralBalance, 
  REWARDS_TIERS, 
  getTierProgress 
} from '../utils/referral';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';

interface VIPCashbackReferralHubProps {
  project: Project;
  isAdmin?: boolean;
  onOpenAdminManager?: () => void;
  className?: string;
}

export default function VIPCashbackReferralHub({
  project,
  isAdmin = false,
  onOpenAdminManager,
  className = ''
}: VIPCashbackReferralHubProps) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [referralsList, setReferralsList] = useState<ReferralRecord[]>([]);
  const [loadingReferrals, setLoadingReferrals] = useState(false);

  const referralCode = getProjectReferralCode(project);
  const balanceInfo = calculateReferralBalance(project);
  const progressInfo = getTierProgress(balanceInfo.currentBalance);

  // Subscribe to real-time referrals subcollection
  useEffect(() => {
    if (!project?.id) return;
    setLoadingReferrals(true);
    try {
      const referralsRef = collection(db, 'projects', project.id, 'referrals');
      const q = query(referralsRef, orderBy('createdAt', 'desc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const records: ReferralRecord[] = [];
        snapshot.forEach((doc) => {
          records.push({ id: doc.id, ...doc.data() } as ReferralRecord);
        });
        setReferralsList(records);
        setLoadingReferrals(false);
      }, (err) => {
        console.warn('Could not listen to referrals subcollection:', err);
        setLoadingReferrals(false);
      });
      return () => unsubscribe();
    } catch (err) {
      console.warn('Error setting up referrals listener:', err);
      setLoadingReferrals(false);
    }
  }, [project.id]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const buildShareWhatsAppUrl = () => {
    const text = 
      `Oi! Estou adorando o resultado do meu ensaio fotográfico com o Dilson Ferreira! 📸✨\n\n` +
      `Se você for fazer um ensaio profissional com ele, usa o meu código exclusivo *${referralCode}*.\n` +
      `Você garante benefícios especiais na sua contratação e eu também acumulo créditos para minha próxima sessão!\n\n` +
      `Conheça o trabalho dele: https://www.dilsonferreira.com.br`;
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  };

  const buildRedeemWhatsAppUrl = () => {
    const text = 
      `Olá Dilson! Tenho *R$ ${balanceInfo.currentBalance.toLocaleString('pt-BR')}* acumulados no meu Clube VIP de Cashback & Indicações (Código: ${referralCode}).\n` +
      `Gostaria de consultar as datas disponíveis para agendar meu próximo ensaio aproveitando esses créditos!`;
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  };

  // Calculate percentage fill for the milestone progress bar
  const firstTier = REWARDS_TIERS[0];
  const isFirstTierUnlocked = balanceInfo.currentBalance >= firstTier.targetAmount;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Container Principal com Estética Laranja Festiva e Alto Contraste VIP */}
      <div className="bg-gradient-to-br from-[#E85E26] via-[#ea580c] to-[#c2410c] border-2 border-orange-300/60 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-2xl shadow-orange-950/60 text-white">
        {/* Ambient Glows */}
        <div className="absolute top-0 right-0 w-[450px] h-[450px] bg-gradient-to-br from-amber-300/20 via-white/10 to-transparent rounded-full filter blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-black/30 rounded-full filter blur-2xl pointer-events-none" />

        {/* Header da Seção */}
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/20 pb-6">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2.5">
              <span className="text-[10px] font-mono tracking-widest text-black font-extrabold uppercase bg-white px-3 py-1 rounded-full shadow-md flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-[#E85E26] fill-[#E85E26]" />
                PROGRAMA FIDELIDADE VIP
              </span>
              <span className="text-[10px] font-mono tracking-widest text-black font-black uppercase bg-emerald-400 px-3 py-1 rounded-full shadow-md flex items-center gap-1.5 border border-emerald-300">
                <Sparkles className="w-3.5 h-3.5 text-black" />
                25% CASHBACK POR INDICAÇÃO FECHADA
              </span>
              <span className="text-[10px] font-mono tracking-widest text-white font-bold uppercase bg-black/60 backdrop-blur-sm px-3 py-1 rounded-full border border-black/40">
                VÁLIDO POR 1 ANO
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5 drop-shadow-sm">
              <span>Acumule Créditos & Zere Seus Próximos Ensaios</span>
            </h2>
            <p className="text-xs sm:text-sm text-white/95 mt-1.5 max-w-2xl leading-relaxed font-medium">
              Cada amigo que fechar um ensaio com o seu código personalizado gera <strong>25% de cashback</strong> direto para a sua conta. Quanto mais amigos você indicar, mais ensaios você pode zerar (100% grátis) ou subir para produções ainda mais completas!
            </p>
          </div>

          {isAdmin && onOpenAdminManager && (
            <button
              type="button"
              onClick={onOpenAdminManager}
              className="bg-black hover:bg-neutral-900 text-emerald-400 border border-black font-mono font-black text-xs uppercase tracking-wider px-4 py-3 rounded-xl transition-all flex items-center gap-2 shrink-0 cursor-pointer shadow-xl self-start md:self-center"
            >
              <Award className="w-4 h-4 text-emerald-400" />
              <span>Painel Admin: Inserir Indicação</span>
            </button>
          )}
        </div>

        {/* Dashboard de Saldo & Código Exclusivo */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-6 relative z-10">
          
          {/* Card 1: Saldo Disponível de Créditos VIP (Inset Obsidian com Escritos Verdes e Brancos) */}
          <div className="lg:col-span-1 bg-[#0b0b0b] text-white border-2 border-black/50 rounded-2xl p-6 flex flex-col justify-between space-y-5 shadow-2xl">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase font-black tracking-widest text-amber-400 flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-emerald-400" /> Saldo VIP Disponível
                </span>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2.5 py-0.5 rounded-full font-bold">
                  ✓ Ativo na Conta
                </span>
              </div>

              <div className="mt-4">
                <span className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-emerald-400 drop-shadow-md">
                  R$ {balanceInfo.currentBalance.toLocaleString('pt-BR')}
                </span>
                <span className="text-xs text-neutral-300 block mt-1 font-mono font-medium">
                  Créditos acumulados para novos ensaios
                </span>
              </div>
            </div>

            {/* Extrato sintético dos créditos */}
            <div className="space-y-2.5 border-t border-neutral-800 pt-3 text-xs font-mono">
              <div className="flex items-center justify-between text-neutral-300">
                <span>Cashback da sua sessão (25%):</span>
                <span className="text-white font-black">+ R$ {balanceInfo.ownCashback.toLocaleString('pt-BR')}</span>
              </div>
              <div className="flex items-center justify-between text-neutral-300">
                <span>Bônus de amigos ({balanceInfo.friendsCount} fechados):</span>
                <span className="text-emerald-400 font-black">+ R$ {balanceInfo.referralCreditsTotal.toLocaleString('pt-BR')}</span>
              </div>
              {balanceInfo.referralCreditsUsed > 0 && (
                <div className="flex items-center justify-between text-neutral-400">
                  <span>Créditos já utilizados:</span>
                  <span className="text-red-400 font-bold">- R$ {balanceInfo.referralCreditsUsed.toLocaleString('pt-BR')}</span>
                </div>
              )}
            </div>

            <a
              href={buildRedeemWhatsAppUrl()}
              target="_blank"
              rel="noreferrer"
              className="w-full bg-emerald-400 hover:bg-emerald-300 text-black font-mono font-black text-xs uppercase tracking-wider py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-950/30 cursor-pointer"
            >
              <MessageCircle className="w-4 h-4 fill-black text-black" />
              <span>Resgatar e Agendar Ensaio</span>
            </a>
          </div>

          {/* Card 2: Seu Código Personalizado & Compartilhamento (Inset Obsidian) */}
          <div className="lg:col-span-2 bg-[#0b0b0b] text-white border-2 border-black/50 rounded-2xl p-6 flex flex-col justify-between space-y-5 shadow-2xl">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase font-black tracking-widest text-[#E85E26] flex items-center gap-1.5">
                  <Gift className="w-4 h-4 text-[#E85E26]" /> Seu Código de Indicação VIP
                </span>
                <span className="text-[10px] font-mono text-black font-extrabold bg-white px-2.5 py-0.5 rounded-full uppercase">
                  {project.clientName}
                </span>
              </div>

              <div className="mt-4 bg-[#141414] border-2 border-dashed border-[#E85E26] rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-mono text-neutral-400 uppercase font-semibold block">Código exclusivo da sua conta:</span>
                  <span className="text-3xl sm:text-4xl font-black text-white font-mono tracking-wider select-all">
                    {referralCode}
                  </span>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="flex-1 sm:flex-none px-4 py-3 bg-white hover:bg-neutral-200 text-black font-black text-xs font-mono rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md"
                  >
                    {copiedCode ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
                        <span className="text-emerald-700 font-black">Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 text-black" />
                        <span>Copiar Código</span>
                      </>
                    )}
                  </button>

                  <a
                    href={buildShareWhatsAppUrl()}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 sm:flex-none px-5 py-3 bg-emerald-400 hover:bg-emerald-300 text-black font-mono font-black text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-950/40"
                  >
                    <Share2 className="w-4 h-4 text-black stroke-[2.5]" />
                    <span>Enviar para Amigos</span>
                  </a>
                </div>
              </div>
            </div>

            <div className="bg-[#141414] border border-neutral-800 rounded-xl p-4 flex items-start gap-3 text-xs text-neutral-200">
              <Users className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-white">
                  Como funciona a soma automática na sua conta:
                </p>
                <p className="text-[11px] text-neutral-300 mt-0.5 leading-relaxed">
                  Envie o seu código para amigos, colegas de trabalho ou familiares. Quando eles fecharem um ensaio com o Dilson Ferreira e informarem o código <strong className="text-amber-400">{referralCode}</strong>, <strong className="text-emerald-400">25% do valor da nova sessão</strong> é creditado instantaneamente na sua barra de progresso!
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* SEÇÃO DA BARRA DE PROGRESSÃO GAMIFICADA (TIERS DE ENSAIO) */}
        <div className="mt-8 pt-8 border-t border-white/20 relative z-10 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-black font-black bg-white px-3 py-1 rounded-full inline-block mb-1.5 shadow-sm">
                PROGRESSÃO DE RECOMPENSAS • ZERAR PRÓXIMO ENSAIO
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                <span>Sua Jornada para Próximas Sessões Gratuitas</span>
              </h3>
            </div>

            {/* Status Callout Pill */}
            <div>
              {isFirstTierUnlocked ? (
                <div className="inline-flex items-center gap-2 bg-emerald-400 text-black px-4 py-2 rounded-full text-xs font-mono font-black shadow-lg">
                  <CheckCircle2 className="w-4 h-4 text-black stroke-[3]" />
                  <span>VOCÊ JÁ PODE ZERAR 1 SESSÃO!</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 bg-black text-emerald-400 border border-black/40 px-4 py-2 rounded-full text-xs font-mono font-black shadow-md">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <span>FALTAM R$ {progressInfo.remainingForNext.toLocaleString('pt-BR')} P/ ZERAR O 1º ENSAIO</span>
                </div>
              )}
            </div>
          </div>

          {/* Gamified Bar Container (Fundo Obsidian com Alto Contraste Verde e Branco) */}
          <div className="bg-[#0b0b0b] text-white border-2 border-black/50 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
            
            {/* Visual Multi-Milestone Progress Tracker Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-neutral-300 font-bold mb-1">
                <span className="text-white">R$ 0</span>
                <span className="text-emerald-400 font-black">Meta Máxima: R$ {progressInfo.highestTierTarget.toLocaleString('pt-BR')}</span>
              </div>

              {/* Progress Line */}
              <div className="w-full bg-[#161616] h-5 rounded-full overflow-hidden p-0.5 border border-neutral-700 relative">
                <div 
                  className="h-full bg-gradient-to-r from-[#E85E26] via-amber-400 to-emerald-400 rounded-full transition-all duration-1000 shadow-lg shadow-emerald-400/40"
                  style={{ width: `${Math.max(4, Math.min(100, (balanceInfo.currentBalance / progressInfo.highestTierTarget) * 100))}%` }}
                />
              </div>
            </div>

            {/* Tiers Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              {REWARDS_TIERS.map((tier, idx) => {
                const isUnlocked = balanceInfo.currentBalance >= tier.targetAmount;
                const remaining = Math.max(0, tier.targetAmount - balanceInfo.currentBalance);
                const percent = Math.min(100, Math.round((balanceInfo.currentBalance / tier.targetAmount) * 100));

                return (
                  <div
                    key={tier.id}
                    className={`rounded-2xl p-5 border transition-all flex flex-col justify-between space-y-4 ${
                      isUnlocked
                        ? 'bg-gradient-to-b from-emerald-950/50 via-[#161616] to-[#0c0c0c] border-2 border-emerald-400 shadow-xl ring-1 ring-emerald-400/30'
                        : 'bg-[#141414] border-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    <div className="space-y-2.5">
                      {/* Top Badge: Unlocked vs Remaining */}
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-neutral-400 font-black uppercase">
                          Nível 0{idx + 1}
                        </span>

                        {isUnlocked ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-black bg-emerald-400 text-black px-2.5 py-0.5 rounded-full shadow-md uppercase">
                            <Check className="w-3 h-3 text-black stroke-[3]" /> 100% Zerado!
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold bg-neutral-900 text-neutral-300 border border-neutral-700 px-2 py-0.5 rounded-full">
                            <Lock className="w-3 h-3 text-amber-500" /> Faltam R$ {remaining}
                          </span>
                        )}
                      </div>

                      {/* Tier Name & Target */}
                      <div>
                        <h4 className="text-sm font-bold text-white font-sans">
                          {tier.name}
                        </h4>
                        <div className="mt-1 flex items-baseline gap-1.5">
                          <span className="text-xl font-mono font-black text-emerald-400">
                            R$ {tier.targetAmount.toLocaleString('pt-BR')}
                          </span>
                          <span className="text-[10px] font-mono text-neutral-400 font-semibold">em créditos</span>
                        </div>
                      </div>

                      <p className="text-[11px] text-neutral-300 leading-relaxed font-medium">
                        {tier.description}
                      </p>

                      {/* Mini Progress */}
                      <div className="space-y-1 pt-1">
                        <div className="w-full bg-[#181818] h-2 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-700 ${isUnlocked ? 'bg-emerald-400' : 'bg-gradient-to-r from-orange-500 to-amber-400'}`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <span className="text-[9px] font-mono text-neutral-400 font-bold block text-right">
                          {percent}% atingido
                        </span>
                      </div>
                    </div>

                    {/* Perks mini list */}
                    <div className="border-t border-neutral-800 pt-3 space-y-1.5">
                      {tier.perks.map((perk, pIdx) => (
                        <div key={pIdx} className="flex items-center gap-1.5 text-[10px] text-neutral-300 font-mono">
                          <Sparkles className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span>{perk}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Motivational Banner */}
            <div className="bg-gradient-to-r from-black via-[#141414] to-black border-2 border-emerald-400/40 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
              <div className="flex items-center gap-3.5">
                <div className="p-3 bg-emerald-400/20 text-emerald-400 rounded-xl border border-emerald-400/40 shrink-0">
                  <Award className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-black text-white">
                    {isFirstTierUnlocked
                      ? '🎉 Você já tem saldo para agendar um ensaio 100% gratuito!'
                      : `Apenas 1 ou 2 amigos indicados já podem zerar completamente a sua próxima sessão!`}
                  </p>
                  <p className="text-[11px] text-neutral-300 mt-0.5">
                    Os créditos não expiram dentro de 1 ano. Quanto mais pessoas contratarem com seu código, mais ensaios você ganha.
                  </p>
                </div>
              </div>

              <a
                href={buildRedeemWhatsAppUrl()}
                target="_blank"
                rel="noreferrer"
                className="bg-emerald-400 hover:bg-emerald-300 text-black font-mono font-black text-xs uppercase tracking-wider px-6 py-3.5 rounded-xl transition-all shrink-0 cursor-pointer shadow-lg shadow-emerald-950/40"
              >
                Agendar com Créditos VIP
              </a>
            </div>

          </div>
        </div>

        {/* EXTRATO DE INDICAÇÕES (HISTÓRICO DE AMIGOS QUE FECHARAM) */}
        <div className="mt-8 pt-8 border-t border-white/20 relative z-10 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-white" />
                <span>Extrato de Amigos Indicados & Trabalhos Fechados</span>
              </h3>
              <p className="text-xs text-white/90 mt-0.5 font-medium">
                Histórico em tempo real de amigos que fecharam ensaios com seu código e creditaram na sua conta.
              </p>
            </div>
            <span className="text-xs font-mono font-black text-black bg-white px-3 py-1 rounded-xl shadow-md">
              {referralsList.length} registro(s)
            </span>
          </div>

          {loadingReferrals ? (
            <div className="bg-[#0b0b0b] text-white border-2 border-black/50 rounded-2xl p-8 text-center text-xs text-neutral-400 font-mono">
              Carregando extrato de indicações...
            </div>
          ) : referralsList.length === 0 ? (
            <div className="bg-[#0b0b0b] text-white border-2 border-black/50 rounded-2xl p-8 text-center space-y-2.5 shadow-xl">
              <Share2 className="w-8 h-8 text-white/60 mx-auto" />
              <p className="text-sm font-bold text-white">Nenhum amigo utilizou seu código ainda.</p>
              <p className="text-xs text-white/80 max-w-md mx-auto">
                Compartilhe o código <strong className="text-emerald-400 font-mono font-black">{referralCode}</strong> no WhatsApp com amigos e colegas para somar créditos de 25% na sua barra de progresso!
              </p>
            </div>
          ) : (
            <div className="bg-[#0b0b0b] text-white border-2 border-black/50 rounded-2xl overflow-hidden divide-y divide-neutral-800 shadow-xl">
              {referralsList.map((ref) => {
                const dateStr = ref.createdAt?.toDate 
                  ? ref.createdAt.toDate().toLocaleDateString('pt-BR') 
                  : ref.createdAt ? new Date(ref.createdAt).toLocaleDateString('pt-BR') : '';

                return (
                  <div key={ref.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-neutral-900/40 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white font-mono">
                          {ref.referredClientName}
                        </span>
                        <span className="text-[10px] font-mono font-black bg-emerald-400 text-black px-2.5 py-0.5 rounded-full shadow-sm">
                          +25% CASHBACK
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-400 font-mono">
                        {ref.referredProjectName || 'Ensaio Fotográfico'} • Contrato fechado no valor de R$ {ref.sessionValue.toLocaleString('pt-BR')}
                      </p>
                      {ref.notes && (
                        <p className="text-[10px] text-neutral-500 italic mt-0.5">
                          Obs: {ref.notes}
                        </p>
                      )}
                    </div>

                    <div className="text-right sm:text-right shrink-0 flex items-center sm:flex-col justify-between sm:justify-center gap-1">
                      <span className="text-base font-mono font-bold text-emerald-400">
                        + R$ {ref.creditGenerated.toLocaleString('pt-BR')}
                      </span>
                      {dateStr && (
                        <span className="text-[10px] font-mono text-neutral-500">
                          {dateStr}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
