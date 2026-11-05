/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Project, ReferralRecord } from '../types';
import { 
  X, Award, Plus, DollarSign, Check, Users, Sparkles, 
  Search, ArrowRight, UserCheck, AlertCircle, RefreshCw, 
  Minus, ShieldCheck 
} from 'lucide-react';
import { 
  getProjectReferralCode, 
  calculateReferralBalance, 
  REWARDS_TIERS 
} from '../utils/referral';
import { db } from '../lib/firebase';
import { 
  collection, addDoc, doc, updateDoc, serverTimestamp 
} from 'firebase/firestore';

interface ReferralManagerModalProps {
  projects: Project[];
  onClose: () => void;
  onRefreshProjects?: () => void;
  initialSelectedProjectId?: string;
}

export default function ReferralManagerModal({
  projects,
  onClose,
  onRefreshProjects,
  initialSelectedProjectId
}: ReferralManagerModalProps) {
  const [activeTab, setActiveTab] = useState<'credit' | 'list'>('credit');
  
  // Credit Form State
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    initialSelectedProjectId || (projects[0]?.id || '')
  );
  const [searchCodeInput, setSearchCodeInput] = useState<string>('');
  const [referredClientName, setReferredClientName] = useState<string>('');
  const [referredProjectName, setReferredProjectName] = useState<string>('');
  const [sessionValue, setSessionValue] = useState<number>(1800);
  const [creditPercent, setCreditPercent] = useState<number>(25);
  const [customCredit, setCustomCredit] = useState<number>(450);
  const [notes, setNotes] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Debit state
  const [debitModalProject, setDebitModalProject] = useState<Project | null>(null);
  const [debitAmount, setDebitAmount] = useState<number>(800);
  const [debitReason, setDebitReason] = useState<string>('Resgate de ensaio gratuito');
  const [debitSaving, setDebitSaving] = useState(false);

  // Filter projects by search
  const [searchTerm, setSearchTerm] = useState('');

  // Find currently selected referrer project
  const selectedProject = projects.find(p => p.id === selectedProjectId) || projects[0];

  // Auto calculate credit amount when sessionValue or creditPercent changes
  const handleSessionValueChange = (val: number) => {
    setSessionValue(val);
    setCustomCredit(Math.round(val * (creditPercent / 100)));
  };

  const handlePercentChange = (pct: number) => {
    setCreditPercent(pct);
    setCustomCredit(Math.round(sessionValue * (pct / 100)));
  };

  // Search by code and auto-select project
  const handleCodeSearch = (code: string) => {
    setSearchCodeInput(code);
    const clean = code.trim().toUpperCase();
    if (!clean) return;
    const match = projects.find(p => {
      const pCode = getProjectReferralCode(p);
      return pCode === clean || p.clientName.toLowerCase().includes(clean.toLowerCase());
    });
    if (match) {
      setSelectedProjectId(match.id);
    }
  };

  // Submit new referral credit
  const handleCreditReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) {
      setErrorMessage('Selecione o cliente que fez a indicação.');
      return;
    }
    if (!referredClientName.trim()) {
      setErrorMessage('Informe o nome do novo cliente indicado.');
      return;
    }
    if (sessionValue <= 0 || customCredit <= 0) {
      setErrorMessage('Informe valores válidos para a sessão e crédito.');
      return;
    }

    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const codeUsed = getProjectReferralCode(selectedProject);
      const creditToAdd = Number(customCredit);

      // 1. Add referral record in Firestore subcollection
      const referralsRef = collection(db, 'projects', selectedProject.id, 'referrals');
      await addDoc(referralsRef, {
        referralCode: codeUsed,
        referredClientName: referredClientName.trim(),
        referredProjectName: referredProjectName.trim() || 'Novo Ensaio Fotográfico',
        sessionValue: Number(sessionValue),
        creditGenerated: creditToAdd,
        status: 'confirmed',
        notes: notes.trim(),
        createdAt: serverTimestamp()
      });

      // 2. Update referrer project balance in Firestore
      const projectRef = doc(db, 'projects', selectedProject.id);
      const newTotalCredits = (selectedProject.referralCreditsTotal || 0) + creditToAdd;
      const newReferralCount = (selectedProject.referralCount || 0) + 1;

      await updateDoc(projectRef, {
        referralCreditsTotal: newTotalCredits,
        referralCount: newReferralCount,
        referralCode: codeUsed,
        updatedAt: serverTimestamp()
      });

      // 3. Create in-app notification for the referrer client
      const notifsRef = collection(db, 'projects', selectedProject.id, 'notifications');
      await addDoc(notifsRef, {
        title: '🎉 Crédito VIP por Indicação Recebido!',
        message: `Seu amigo ${referredClientName.trim()} acabou de fechar um ensaio com o seu código ${codeUsed}! Creditamos +R$ ${creditToAdd.toLocaleString('pt-BR')} na sua conta para zerar seus próximos ensaios!`,
        type: 'approval',
        createdAt: serverTimestamp(),
        read: false,
        recipientEmail: selectedProject.clientEmail
      });

      setSuccessMessage(
        `Sucesso! R$ ${creditToAdd.toLocaleString('pt-BR')} creditados com sucesso para ${selectedProject.clientName}. O saldo agora é de R$ ${(calculateReferralBalance(selectedProject).currentBalance + creditToAdd).toLocaleString('pt-BR')}!`
      );

      // Reset form fields
      setReferredClientName('');
      setReferredProjectName('');
      setNotes('');

      if (onRefreshProjects) onRefreshProjects();
    } catch (err: any) {
      console.error('Error crediting referral:', err);
      setErrorMessage(err?.message || 'Falha ao processar crédito de indicação.');
    } finally {
      setSaving(false);
    }
  };

  // Submit credit debit / redemption
  const handleExecuteDebit = async () => {
    if (!debitModalProject) return;
    setDebitSaving(true);
    try {
      const projectRef = doc(db, 'projects', debitModalProject.id);
      const newUsed = (debitModalProject.referralCreditsUsed || 0) + Number(debitAmount);

      await updateDoc(projectRef, {
        referralCreditsUsed: newUsed,
        updatedAt: serverTimestamp()
      });

      // Create notification
      const notifsRef = collection(db, 'projects', debitModalProject.id, 'notifications');
      await addDoc(notifsRef, {
        title: '✨ Resgate de Créditos VIP Realizado',
        message: `Você resgatou R$ ${Number(debitAmount).toLocaleString('pt-BR')} em créditos VIP para seu ensaio (${debitReason}).`,
        type: 'status_change',
        createdAt: serverTimestamp(),
        read: false,
        recipientEmail: debitModalProject.clientEmail
      });

      setDebitModalProject(null);
      if (onRefreshProjects) onRefreshProjects();
    } catch (err: any) {
      console.error('Error debiting credits:', err);
      alert('Erro ao debitar créditos: ' + err?.message);
    } finally {
      setDebitSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-3xl bg-[#141414] border border-neutral-800 rounded-3xl p-6 md:p-8 shadow-2xl my-8 space-y-6 animate-scale-up">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-900 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-500">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Gestão do Clube de Cashback & Indicações VIP
              </h2>
              <p className="text-xs text-neutral-400">
                Insira novos clientes indicados, credite 25% na conta de quem indicou e gerencie saldos.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-900 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 border-b border-neutral-900 pb-3">
          <button
            type="button"
            onClick={() => setActiveTab('credit')}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'credit'
                ? 'bg-amber-500 text-black shadow-md shadow-amber-950/30'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900 border border-neutral-850'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Inserir & Creditar Nova Indicação</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('list')}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'list'
                ? 'bg-neutral-800 text-white border border-neutral-700 shadow-md'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900 border border-neutral-850'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Ver Todos os Clientes & Saldos ({projects.length})</span>
          </button>
        </div>

        {/* TAB 1: CREDITAR NOVA INDICAÇÃO */}
        {activeTab === 'credit' && (
          <form onSubmit={handleCreditReferral} className="space-y-5">
            {successMessage && (
              <div className="p-4 bg-emerald-950/40 border border-emerald-900/60 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {errorMessage && (
              <div className="p-4 bg-red-950/40 border border-red-900/60 rounded-xl text-xs text-red-300 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Step 1: Escolher o cliente indicador */}
            <div className="bg-[#181818] border border-neutral-850 rounded-2xl p-5 space-y-4">
              <span className="text-[10px] font-mono font-bold tracking-widest text-amber-500 uppercase block">
                1. Cliente Que Indicou (Beneficiário dos Créditos)
              </span>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-mono text-neutral-300 block mb-1">
                    Buscar por Código ou Nome:
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Ex: DILSON-CUROL-25..."
                      value={searchCodeInput}
                      onChange={(e) => handleCodeSearch(e.target.value)}
                      className="w-full bg-[#101010] border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono uppercase focus:border-amber-500 focus:outline-none"
                    />
                    <Search className="w-4 h-4 text-neutral-500 absolute right-3 top-3 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-mono text-neutral-300 block mb-1">
                    Ou Selecione o Projeto / Cliente:
                  </label>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="w-full bg-[#101010] border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-amber-400 font-mono font-bold focus:border-amber-500 focus:outline-none"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.clientName} • {getProjectReferralCode(p)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Informações do Indicador Selecionado */}
              {selectedProject && (() => {
                const b = calculateReferralBalance(selectedProject);
                return (
                  <div className="bg-[#121212] border border-neutral-800 rounded-xl p-3.5 flex items-center justify-between text-xs font-mono">
                    <div className="space-y-0.5">
                      <p className="text-white font-bold">{selectedProject.clientName} ({selectedProject.projectName})</p>
                      <p className="text-neutral-400 text-[11px]">
                        Código: <strong className="text-amber-400">{getProjectReferralCode(selectedProject)}</strong> • Amigos indicados: {b.friendsCount}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-neutral-500 block">Saldo Atual:</span>
                      <span className="text-base font-bold text-emerald-400">
                        R$ {b.currentBalance.toLocaleString('pt-BR')}
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Step 2: Dados do Novo Cliente Indicado */}
            <div className="bg-[#181818] border border-neutral-850 rounded-2xl p-5 space-y-4">
              <span className="text-[10px] font-mono font-bold tracking-widest text-[#E85E26] uppercase block">
                2. Novo Cliente Que Fechou o Ensaio
              </span>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-mono text-neutral-300 block mb-1">
                    Nome do Novo Cliente: *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Paulinha Oliveira, Bruno Santos..."
                    value={referredClientName}
                    onChange={(e) => setReferredClientName(e.target.value)}
                    className="w-full bg-[#101010] border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-[#E85E26] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-mono text-neutral-300 block mb-1">
                    Projeto / Pacote Contratado:
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Retrato Editorial Completo..."
                    value={referredProjectName}
                    onChange={(e) => setReferredProjectName(e.target.value)}
                    className="w-full bg-[#101010] border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-[#E85E26] focus:outline-none"
                  />
                </div>
              </div>

              {/* Valores e Cálculo de 25% */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div>
                  <label className="text-xs font-mono text-neutral-300 block mb-1">
                    Valor Fechado da Sessão (R$): *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={sessionValue}
                    onChange={(e) => handleSessionValueChange(Number(e.target.value))}
                    className="w-full bg-[#101010] border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold text-white focus:border-[#E85E26] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-mono text-neutral-300 block mb-1">
                    Porcentagem de Cashback:
                  </label>
                  <div className="flex items-center gap-1.5">
                    {[20, 25, 30].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => handlePercentChange(pct)}
                        className={`flex-1 py-2 rounded-xl text-xs font-mono font-bold border ${
                          creditPercent === pct
                            ? 'bg-amber-500 text-black border-amber-500'
                            : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'
                        }`}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-mono text-neutral-300 block mb-1">
                    Crédito a ser Somado (R$): *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={customCredit}
                    onChange={(e) => setCustomCredit(Number(e.target.value))}
                    className="w-full bg-[#101010] border border-emerald-500/50 rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold text-emerald-400 focus:border-emerald-400 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-mono text-neutral-300 block mb-1">
                  Observações Internas (Opcional):
                </label>
                <input
                  type="text"
                  placeholder="Ex: Contrato assinado via WhatsApp com 2 looks..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-[#101010] border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-3 rounded-xl text-xs font-mono text-neutral-400 hover:text-white hover:bg-neutral-900 border border-neutral-800 transition-all cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={saving}
                className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-mono font-bold text-xs uppercase tracking-wider px-6 py-3 rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-amber-950/20"
              >
                <Award className="w-4 h-4 text-black" />
                <span>{saving ? 'Creditando...' : 'Confirmar & Creditar na Conta'}</span>
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: LISTA DE TODOS OS CLIENTES & SALDOS */}
        {activeTab === 'list' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Filtrar por nome de cliente ou código..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-[#101010] border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-amber-500 focus:outline-none"
                />
                <Search className="w-4 h-4 text-neutral-500 absolute right-3 top-3 pointer-events-none" />
              </div>
            </div>

            <div className="border border-neutral-850 rounded-2xl overflow-hidden divide-y divide-neutral-850 max-h-[420px] overflow-y-auto">
              {projects
                .filter(p => 
                  p.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  getProjectReferralCode(p).toLowerCase().includes(searchTerm.toLowerCase())
                )
                .map((p) => {
                  const b = calculateReferralBalance(p);
                  const code = getProjectReferralCode(p);
                  const isZeroed = b.currentBalance >= 800;

                  return (
                    <div key={p.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#141414] hover:bg-neutral-900/50 transition-colors">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white font-sans">{p.clientName}</span>
                          <span className="text-[10px] font-mono bg-neutral-900 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-md font-bold">
                            {code}
                          </span>
                          {isZeroed && (
                            <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                              ✓ Ensaio Zerado
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-neutral-400 font-mono">
                          {p.projectName} • {b.friendsCount} amigo(s) indicados
                        </p>
                      </div>

                      <div className="flex items-center gap-4 justify-between sm:justify-end">
                        <div className="text-right">
                          <span className="text-xs font-mono text-neutral-500 block">Saldo Disponível</span>
                          <span className="text-lg font-mono font-bold text-emerald-400">
                            R$ {b.currentBalance.toLocaleString('pt-BR')}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedProjectId(p.id);
                              setActiveTab('credit');
                            }}
                            className="p-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-amber-400 rounded-xl transition-all cursor-pointer text-xs font-mono flex items-center gap-1"
                            title="Creditar nova indicação para este cliente"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Creditar</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setDebitModalProject(p);
                              setDebitAmount(Math.min(800, b.currentBalance));
                            }}
                            disabled={b.currentBalance <= 0}
                            className="p-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 disabled:opacity-40 rounded-xl transition-all cursor-pointer text-xs font-mono flex items-center gap-1"
                            title="Debitar créditos utilizados"
                          >
                            <Minus className="w-3.5 h-3.5 text-red-400" />
                            <span className="hidden sm:inline">Debitar</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

      </div>

      {/* Mini Modal para Debitar Créditos */}
      {debitModalProject && (
        <div className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-neutral-800 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">
              Debitar Créditos de {debitModalProject.clientName}
            </h3>
            <p className="text-xs text-neutral-400">
              Utilize esta opção quando o cliente agendar e usufruir de um ensaio gratuito ou desconto de indicação.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-mono text-neutral-300 block mb-1">Valor a ser Debitado (R$):</label>
                <input
                  type="number"
                  min="1"
                  value={debitAmount}
                  onChange={(e) => setDebitAmount(Number(e.target.value))}
                  className="w-full bg-[#101010] border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold text-white focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-neutral-300 block mb-1">Motivo do Resgate:</label>
                <input
                  type="text"
                  value={debitReason}
                  onChange={(e) => setDebitReason(e.target.value)}
                  className="w-full bg-[#101010] border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDebitModalProject(null)}
                className="px-4 py-2 text-xs font-mono text-neutral-400 hover:text-white"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleExecuteDebit}
                disabled={debitSaving}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-mono font-bold"
              >
                {debitSaving ? 'Debitando...' : 'Confirmar Débito'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
