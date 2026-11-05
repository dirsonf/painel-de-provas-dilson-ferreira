/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Project, RewardsTier } from '../types';

/**
 * Standard photography session rewards tiers for Dilson Ferreira
 */
export const REWARDS_TIERS: RewardsTier[] = [
  {
    id: 'tier_degustacao',
    name: 'Retrato Individual / Degustação',
    targetAmount: 800,
    badge: '🚀 Sessão 100% Zerada',
    description: 'Sessão individual com iluminação profissional de estúdio e fotos tratadas com retoque fino.',
    perks: ['1 look com iluminação de estúdio', 'Fotos tratadas em alta resolução', 'Direção de poses exclusiva']
  },
  {
    id: 'tier_editorial',
    name: 'Ensaio Editorial & Corporativo',
    targetAmount: 1600,
    badge: '⭐ Ensaio Completo Zerado',
    description: 'Produção executiva ou criativa para renovar posicionamento de imagem e autoridade.',
    perks: ['2 trocas de figurino', 'Direção de poses e postura executiva', 'Formatos prontos para LinkedIn e Redes']
  },
  {
    id: 'tier_master',
    name: 'Ensaio Master VIP & Branding',
    targetAmount: 2800,
    badge: '👑 Master VIP Studio',
    description: 'Super produção com maquiagem profissional, stylist, estúdio + externa e mini-vídeos para Reels.',
    perks: ['Make & Hair profissional inclusos', 'Consultoria de figurino e cenários', 'Estúdio + locação externa', 'Mini-vídeos verticais inclusos']
  },
  {
    id: 'tier_campanha',
    name: 'Super Campanha Visual Anual',
    targetAmount: 4500,
    badge: '💎 Turnê / Campanha Anual',
    description: 'Acervo visual completo de marca pessoal ou artística para alimentar todo o seu ano.',
    perks: ['Diária completa de fotos e direção', 'Banco amplo de fotos tratadas', 'Acervo definitivo de autoridade']
  }
];

/**
 * Cleans a string into a clean uppercase alphanumeric slug for referral codes
 */
export function cleanCodeSlug(name: string): string {
  if (!name) return 'CLIENTE';
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .slice(0, 12);
}

/**
 * Returns the project's unique, human-readable referral code.
 * Falls back to DILSON-{CLIENTNAME}-25
 */
export function getProjectReferralCode(project: Project): string {
  if (project.referralCode && project.referralCode.trim()) {
    return project.referralCode.trim().toUpperCase();
  }
  const slug = cleanCodeSlug(project.clientName || 'CLIENTE');
  return `DILSON-${slug}-25`;
}

/**
 * Calculates current cashback and referral balance
 */
export function calculateReferralBalance(project: Project) {
  const sessionBaseValue = project.sessionValue || project.priceEstimate || 1200;
  // Base 25% cashback from client's own completed session
  const ownCashback = Math.round(sessionBaseValue * 0.25);
  
  // Additional referral credits earned from friends who closed sessions
  const referralCreditsTotal = project.referralCreditsTotal || 0;
  const referralCreditsUsed = project.referralCreditsUsed || 0;
  
  // Total accumulated and current available balance
  const totalAccumulated = ownCashback + referralCreditsTotal;
  const currentBalance = Math.max(0, totalAccumulated - referralCreditsUsed);
  const friendsCount = project.referralCount || 0;

  return {
    ownCashback,
    referralCreditsTotal,
    referralCreditsUsed,
    totalAccumulated,
    currentBalance,
    friendsCount
  };
}

/**
 * Computes progress toward next tier and current unlocked tiers
 */
export function getTierProgress(currentBalance: number) {
  const highestTierTarget = REWARDS_TIERS[REWARDS_TIERS.length - 1].targetAmount;
  
  // Find unlocked tiers (where balance >= target)
  const unlockedTiers = REWARDS_TIERS.filter(tier => currentBalance >= tier.targetAmount);
  
  // Find the next target tier that has not yet been unlocked
  const nextTier = REWARDS_TIERS.find(tier => currentBalance < tier.targetAmount) || null;
  
  const remainingForNext = nextTier ? Math.max(0, nextTier.targetAmount - currentBalance) : 0;
  
  // Percentage to next tier or total max
  const overallPercent = Math.min(100, Math.round((currentBalance / highestTierTarget) * 100));

  return {
    unlockedTiers,
    nextTier,
    remainingForNext,
    overallPercent,
    highestTierTarget
  };
}
