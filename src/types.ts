/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Project {
  id: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  projectName: string;
  status: 'uploaded' | 'reviewing' | 'approved' | 'editing' | 'partial_delivered' | 'delivered';
  driveFolderId: string;
  selectedDriveFolderId?: string;
  deliveredDriveFolderId?: string;
  deliveredCount?: number;
  deliveryNotes?: string;
  deliveryEstimate?: string;
  createdAt: any; // Timestamp or ISO string
  updatedAt: any;
  selectedCount: number;
  totalCount: number;
  adminNotes?: string;
  priceEstimate?: number;
  contractedCount?: number;
  extraPhotoPrice?: number;
  bonusPhotosCount?: number;
  clientFinalNotes?: string;
  googleReviewUrl?: string;
  sessionDate?: string;
  sessionValue?: number;
  referralCode?: string;
  referredByCode?: string;
  referralCreditsTotal?: number;
  referralCreditsUsed?: number;
  referralCount?: number;
}

export interface ReferralRecord {
  id: string;
  referralCode: string;
  referredClientName: string;
  referredClientEmail?: string;
  referredProjectName?: string;
  sessionValue: number;
  creditGenerated: number;
  createdAt: any;
  status: 'confirmed' | 'pending';
  notes?: string;
}

export interface RewardsTier {
  id: string;
  name: string;
  targetAmount: number;
  description: string;
  badge: string;
  perks: string[];
}

export interface Proof {
  id: string;
  driveFileId?: string;
  name: string;
  thumbnailUrl: string;
  fullUrl: string;
  status: 'pending' | 'approved' | 'rejected';
  clientNotes?: string;
  isSelected: boolean;
  isBonus?: boolean;
  bonusNote?: string;
  updatedAt: any;
}

export interface DeliveredProof {
  id: string;
  driveFileId?: string;
  name: string;
  thumbnailUrl: string;
  fullUrl: string;
  downloadUrl?: string;
  batchType: 'partial' | 'final';
  creativeNotes?: string;
  notes?: string;
  isBonus?: boolean;
  bonusNote?: string;
  deliveredAt?: any;
  updatedAt: any;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'status_change' | 'approval' | 'notes_added' | 'system';
  createdAt: any;
  read: boolean;
  recipientEmail: string;
}

export interface AIEffectSuggestion {
  id: string;
  category: 'text' | 'graphic' | 'ai_prompt';
  title: string;
  content: string;
  subtext?: string;
  tags?: string[];
  recommendedTool?: string;
}
