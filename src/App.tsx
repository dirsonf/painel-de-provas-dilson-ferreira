/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  auth, db, initAuth, googleSignIn, logoutUser, getAccessToken, 
  reconnectGoogleDrive, isDriveTokenFresh,
  handleFirestoreError, OperationType 
} from './lib/firebase';
import { 
  listFolderImages, listDeliveredImages, extractDriveFolderId, getDriveFolderUrl, 
  copySelectedProofsToDriveFolder, sanitizePhotoUrl 
} from './lib/drive';
import { Project, Proof, Notification, DeliveredProof } from './types';
import { 
  collection, doc, onSnapshot, query, setDoc, updateDoc, 
  deleteDoc, where, orderBy, serverTimestamp, getDocs, writeBatch 
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Camera, LogOut, Loader2, Sparkles, FolderSync, Calendar, 
  DollarSign, Mail, Phone, Clock, ArrowLeft, Send, CheckSquare, 
  UserCheck, Bell, Shield, Compass, FileCheck, CheckCircle2,
  FolderEdit, AlertTriangle, ExternalLink, RefreshCw, X, Table, LayoutGrid, Copy, Check, Eye,
  Cloud, HardDrive, PackageCheck, Gift, FolderCheck, SlidersHorizontal,
  Download, FileCode, Award, Flame, Users
} from 'lucide-react';

// Subcomponents
import StatusTracker from './components/StatusTracker';
import NotificationPanel from './components/NotificationPanel';
import ImageProofCard from './components/ImageProofCard';
import ZoomProofModal from './components/ZoomProofModal';
import CreateProjectModal from './components/CreateProjectModal';
import EditProjectModal from './components/EditProjectModal';
import SelectedProofsHub from './components/SelectedProofsHub';
import ProjectListAdmin from './components/ProjectListAdmin';
import ClientSelectionsTable from './components/ClientSelectionsTable';
import FloatingSelectionBar from './components/FloatingSelectionBar';
import FinalizeBatchModal from './components/FinalizeBatchModal';
import DeliveredMaterialHub from './components/DeliveredMaterialHub';
import ExtraPhotosAndCashbackCard from './components/ExtraPhotosAndCashbackCard';
import ReferralManagerModal from './components/ReferralManagerModal';

export default function App() {
  // Authentication & Profile States
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isReferralManagerOpen, setIsReferralManagerOpen] = useState(false);

  // Role View Mode: Photographer / Admin vs Client
  const [viewRole, setViewRole] = useState<'admin' | 'client'>(() => {
    return (localStorage.getItem('dilson_view_role') as 'admin' | 'client') || 'admin';
  });

  const effectiveIsAdmin = user?.email === 'contato@dilsonferreira.com.br' || viewRole === 'admin';

  // Firestore Projects States (persisted selection across page refreshes)
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(() => {
    return localStorage.getItem('dilson_active_project_id');
  });
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [proofs, setProofs] = useState<Proof[]>([]);
  const [deliveredProofs, setDeliveredProofs] = useState<DeliveredProof[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Main Project View Tab: 'proofs', 'selected', 'delivered', or 'extras_cashback'
  const [projectMainTab, setProjectMainTab] = useState<'proofs' | 'selected' | 'delivered' | 'extras_cashback'>('proofs');
  const [syncingDelivered, setSyncingDelivered] = useState(false);
  const [syncingSelected, setSyncingSelected] = useState(false);

  // UI Modals / Interactivity States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditProjectModalOpen, setIsEditProjectModalOpen] = useState(false);
  const [zoomedProof, setZoomedProof] = useState<Proof | null>(null);
  const [syncingFolder, setSyncingFolder] = useState(false);
  const [adminCustomNotif, setAdminCustomNotif] = useState('');
  const [isPreviewAsClient, setIsPreviewAsClient] = useState(false);

  const [adminViewTab, setAdminViewTab] = useState<'cards' | 'database'>('cards');
  const [isEditingFolderModal, setIsEditingFolderModal] = useState(false);
  const [editFolderInput, setEditFolderInput] = useState('');
  const [editSelectedFolderInput, setEditSelectedFolderInput] = useState('');
  const [editDeliveredFolderInput, setEditDeliveredFolderInput] = useState('');
  const [isCopyingToDrive, setIsCopyingToDrive] = useState(false);

  // Floating Bar & Selection Finalize States
  const [isFinalizeModalOpen, setIsFinalizeModalOpen] = useState(false);
  const [clientGalleryFilter, setClientGalleryFilter] = useState<'all' | 'selected' | 'notes'>('all');
  const [hasCopiedNames, setHasCopiedNames] = useState(false);

  const handleSelectActiveProject = (id: string | null) => {
    setActiveProjectId(id);
    if (id) {
      localStorage.setItem('dilson_active_project_id', id);
    } else {
      localStorage.removeItem('dilson_active_project_id');
    }
  };

  const handleToggleViewRole = (role: 'admin' | 'client') => {
    setViewRole(role);
    localStorage.setItem('dilson_view_role', role);
    setIsPreviewAsClient(false);
  };

  // 1. Initial Authentication Binding
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, activeToken) => {
        setUser(currentUser);
        setToken(activeToken || getAccessToken());
        setAuthLoading(false);
      },
      () => {
        setUser(null);
        setToken(null);
        setAuthLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // 2. Google Auth Logins
  const handleLogin = async () => {
    setAuthLoading(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setToken(result.accessToken);
      }
    } catch (err: any) {
      if (err?.code !== 'auth/popup-closed-by-user' && err?.code !== 'auth/cancelled-popup-request') {
        console.error('Core Sign-in Failed:', err);
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      setUser(null);
      setToken(null);
      handleSelectActiveProject(null);
      setActiveProject(null);
      setProjects([]);
      setProofs([]);
      setDeliveredProofs([]);
      setNotifications([]);
      setProjectMainTab('proofs');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const handleReconnectDrive = async () => {
    try {
      setStatusMessage('Conectando ao Google Drive...');
      const newToken = await reconnectGoogleDrive();
      if (newToken) {
        setToken(newToken);
        setStatusMessage('Google Drive conectado com sucesso!');
        setTimeout(() => setStatusMessage(null), 3000);
      } else {
        setStatusMessage(null);
      }
    } catch (err: any) {
      if (err?.code !== 'auth/popup-closed-by-user' && err?.code !== 'auth/cancelled-popup-request') {
        console.error('Drive reconnection error:', err);
        setStatusMessage('Erro ao conectar ao Google Drive: ' + (err?.message || 'Erro'));
        setTimeout(() => setStatusMessage(null), 4000);
      } else {
        setStatusMessage(null);
      }
    }
  };

  // 3. Real-time Projects query syncing with persistent state
  useEffect(() => {
    if (!user) return;

    const path = 'projects';
    // If in photographer mode (or Dilson Ferreira), load all projects
    // If in client mode, filter by clientEmail matching user's email
    let q;
    if (effectiveIsAdmin || user.email === 'contato@dilsonferreira.com.br') {
      q = collection(db, path);
    } else {
      q = query(collection(db, path), where('clientEmail', '==', user.email.toLowerCase()));
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const projs: Project[] = [];
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          projs.push({
            id: d.id,
            clientName: d.clientName,
            clientEmail: d.clientEmail,
            clientPhone: d.clientPhone,
            projectName: d.projectName,
            status: d.status,
            driveFolderId: d.driveFolderId,
            selectedDriveFolderId: d.selectedDriveFolderId || '',
            deliveredDriveFolderId: d.deliveredDriveFolderId || '',
            deliveryEstimate: d.deliveryEstimate,
            createdAt: d.createdAt,
            updatedAt: d.updatedAt,
            selectedCount: d.selectedCount || 0,
            deliveredCount: d.deliveredCount || 0,
            totalCount: d.totalCount || 0,
            adminNotes: d.adminNotes,
            deliveryNotes: d.deliveryNotes || '',
            priceEstimate: d.priceEstimate || 0,
            contractedCount: d.contractedCount || 10,
            bonusPhotosCount: d.bonusPhotosCount || 0,
            extraPhotoPrice: d.extraPhotoPrice !== undefined ? d.extraPhotoPrice : 75,
            googleReviewUrl: d.googleReviewUrl || ''
          });
        });

        // Sort descending by creation date in memory (robust against Firestore missing composite index)
        projs.sort((a, b) => {
          const tA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
          const tB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
          return tB - tA;
        });

        setProjects(projs);

        // Retain saved project or select first
        const savedId = localStorage.getItem('dilson_active_project_id');
        if (savedId && projs.some(p => p.id === savedId)) {
          setActiveProjectId(savedId);
        } else if (!effectiveIsAdmin && projs.length > 0) {
          handleSelectActiveProject(projs[0].id);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );

    return () => unsubscribe();
  }, [user, effectiveIsAdmin]);

  // Track currently active project object
  useEffect(() => {
    if (!activeProjectId) {
      setActiveProject(null);
      setIsPreviewAsClient(false);
      return;
    }
    const found = projects.find(p => p.id === activeProjectId);
    if (found) {
      setActiveProject(found);
    } else if (projects.length > 0) {
      // If projects list has loaded but activeProjectId does not exist, safely reset
      setActiveProjectId(null);
      setActiveProject(null);
    }
  }, [activeProjectId, projects]);

  // 4. Real-time Proofs & Notifications synced child collections query
  useEffect(() => {
    if (!user || !activeProjectId) {
      setProofs([]);
      setDeliveredProofs([]);
      setNotifications([]);
      return;
    }

    const proofsPath = `projects/${activeProjectId}/proofs`;
    const unsubProofs = onSnapshot(
      collection(db, 'projects', activeProjectId, 'proofs'),
      (snapshot) => {
        const prfs: Proof[] = [];
        snapshot.forEach((pDoc) => {
          const d = pDoc.data();
          const driveId = d.driveFileId || d.id;
          prfs.push({
            id: d.id,
            driveFileId: driveId,
            name: d.name,
            thumbnailUrl: sanitizePhotoUrl(d.thumbnailUrl, driveId),
            fullUrl: sanitizePhotoUrl(d.fullUrl, driveId),
            status: d.status,
            clientNotes: d.clientNotes,
            isSelected: d.isSelected || false,
            updatedAt: d.updatedAt
          });
        });
        // Sort proofs alphabetically by photo file name
        prfs.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
        setProofs(prfs);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, proofsPath);
      }
    );

    const deliveredPath = `projects/${activeProjectId}/delivered`;
    const unsubDelivered = onSnapshot(
      collection(db, 'projects', activeProjectId, 'delivered'),
      (snapshot) => {
        const deliv: DeliveredProof[] = [];
        snapshot.forEach((dDoc) => {
          const d = dDoc.data();
          const driveId = d.driveFileId || d.id;
          deliv.push({
            id: d.id,
            driveFileId: driveId,
            name: d.name,
            thumbnailUrl: sanitizePhotoUrl(d.thumbnailUrl, driveId),
            fullUrl: sanitizePhotoUrl(d.fullUrl, driveId),
            downloadUrl: d.downloadUrl || sanitizePhotoUrl(d.fullUrl, driveId),
            batchType: d.batchType || 'partial',
            notes: d.notes,
            deliveredAt: d.deliveredAt,
            updatedAt: d.updatedAt || d.deliveredAt || new Date().toISOString()
          });
        });
        deliv.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
        setDeliveredProofs(deliv);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, deliveredPath);
      }
    );

    const notifPath = `projects/${activeProjectId}/notifications`;
    const unsubNotif = onSnapshot(
      query(collection(db, 'projects', activeProjectId, 'notifications'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        const ntfs: Notification[] = [];
        snapshot.forEach((nDoc) => {
          const d = nDoc.data();
          ntfs.push({
            id: d.id,
            title: d.title,
            message: d.message,
            type: d.type,
            createdAt: d.createdAt ? (d.createdAt.toDate ? d.createdAt.toDate().toISOString() : d.createdAt) : new Date().toISOString(),
            read: d.read || false,
            recipientEmail: d.recipientEmail
          });
        });
        setNotifications(ntfs);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, notifPath);
      }
    );

    return () => {
      unsubProofs();
      unsubDelivered();
      unsubNotif();
    };
  }, [activeProjectId, user]);

  // Auto-switch to 'delivered' tab when active project is in partial_delivered or delivered status
  useEffect(() => {
    if (activeProject) {
      if (activeProject.status === 'partial_delivered' || activeProject.status === 'delivered') {
        setProjectMainTab('delivered');
      }
    }
  }, [activeProject?.id, activeProject?.status]);

  // 5. Google Drive Synchronization Crawler Logic
  const handleSyncDriveFolder = async (projectId: string, customFolderInput?: string) => {
    const projectToSync = projects.find(p => p.id === projectId);
    if (!projectToSync) return;

    setSyncingFolder(true);
    setStatusMessage('Verificando conexão com o Google Drive...');
    try {
      let activeToken = getAccessToken();
      if (!activeToken) {
        setStatusMessage('Conectando ao Google Drive para autorizar acesso...');
        activeToken = await reconnectGoogleDrive();
        if (activeToken) setToken(activeToken);
      }

      if (!activeToken) {
        setStatusMessage('Não foi possível obter acesso ao Google Drive. Por favor, conecte sua conta Google.');
        setTimeout(() => setStatusMessage(null), 5000);
        return;
      }

      const rawFolder = customFolderInput || projectToSync.driveFolderId;
      const cleanFolderId = extractDriveFolderId(rawFolder);

      setStatusMessage('Buscando todas as fotos da pasta do Google Drive (varrendo subpastas e RAWs)...');
      let imagesFetched: Proof[] = [];
      try {
        imagesFetched = await listFolderImages(cleanFolderId, activeToken, false);
      } catch (driveErr: any) {
        if (driveErr?.name === 'DriveAuthExpiredError') {
          setStatusMessage('Token do Google Drive expirou. Renovando credenciais...');
          activeToken = await reconnectGoogleDrive();
          if (activeToken) {
            setToken(activeToken);
            imagesFetched = await listFolderImages(cleanFolderId, activeToken, false);
          } else {
            throw driveErr;
          }
        } else {
          throw driveErr;
        }
      }

      if (imagesFetched.length === 0) {
        setStatusMessage('Nenhuma imagem/foto encontrada nesta pasta do Google Drive. Verifique se o link/código da pasta está correto e público/compartilhado.');
        setTimeout(() => setStatusMessage(null), 6000);
        return;
      }

      setStatusMessage(`Encontradas ${imagesFetched.length} fotos! Gravando na galeria do ensaio...`);

      // Write in atomic batches of 400 documents
      const proofsCollection = collection(db, 'projects', projectId, 'proofs');
      const batchSize = 400;

      for (let i = 0; i < imagesFetched.length; i += batchSize) {
        const batch = writeBatch(db);
        const chunk = imagesFetched.slice(i, i + batchSize);

        for (const img of chunk) {
          const proofDocRef = doc(proofsCollection, img.id);
          batch.set(proofDocRef, {
            id: img.id,
            driveFileId: img.driveFileId || '',
            name: img.name,
            thumbnailUrl: img.thumbnailUrl,
            fullUrl: img.fullUrl,
            status: 'pending',
            isSelected: false,
            updatedAt: serverTimestamp()
          }, { merge: true });
        }

        await batch.commit();
      }

      // Update total photo counts inside parent project
      const projectUpdate: any = {
        totalCount: imagesFetched.length,
        driveFolderId: cleanFolderId,
        updatedAt: serverTimestamp()
      };
      await updateDoc(doc(db, 'projects', projectId), projectUpdate);

      setStatusMessage(`Sucesso! ${imagesFetched.length} fotos sincronizadas e salvas no banco de dados.`);
      setTimeout(() => setStatusMessage(null), 5000);
    } catch (error: any) {
      console.error('Failed to sync Drive Folder contents:', error);
      const msg = error?.message || 'Erro ao sincronizar pasta do Google Drive.';
      setStatusMessage(`Erro de sincronização: ${msg}`);
      setTimeout(() => setStatusMessage(null), 6000);
    } finally {
      setSyncingFolder(false);
    }
  };

  // 5b. Synchronize 03 - EDITADAS folder with Delivered Materials Hub
  const handleSyncDeliveredFolder = async (projectId: string, customFolderInput?: string) => {
    const projectToSync = projects.find(p => p.id === projectId);
    if (!projectToSync) return;

    setSyncingDelivered(true);
    setStatusMessage('Buscando fotos na Pasta 03 - EDITADAS do Google Drive...');
    try {
      let activeToken = getAccessToken();
      if (!activeToken) {
        activeToken = await reconnectGoogleDrive();
        if (activeToken) setToken(activeToken);
      }

      const rawFolder = customFolderInput || projectToSync.deliveredDriveFolderId;
      const cleanFolderId = extractDriveFolderId(rawFolder);

      if (!cleanFolderId) {
        setStatusMessage('Pasta 03 - EDITADAS ainda não configurada neste projeto. Configure o link no painel.');
        setTimeout(() => setStatusMessage(null), 4500);
        return;
      }

      const isPartial = projectToSync.status === 'partial_delivered';
      const batchType: 'partial' | 'final' = isPartial ? 'partial' : 'final';

      setStatusMessage('Sincronizando arquivos finais da Pasta 03 - EDITADAS...');
      const deliveredItems = await listDeliveredImages(
        cleanFolderId,
        activeToken || '',
        batchType,
        true // allow realistic portfolio samples if offline/fallback
      );

      if (deliveredItems.length === 0) {
        setStatusMessage('Nenhum arquivo final encontrado na Pasta 03 - EDITADAS.');
        setTimeout(() => setStatusMessage(null), 4500);
        return;
      }

      setStatusMessage(`Encontradas ${deliveredItems.length} foto(s) editadas! Gravando na Área de Entrega...`);
      const deliveredCol = collection(db, 'projects', projectId, 'delivered');
      const batchSize = 400;

      for (let i = 0; i < deliveredItems.length; i += batchSize) {
        const batch = writeBatch(db);
        const chunk = deliveredItems.slice(i, i + batchSize);
        for (const item of chunk) {
          const docRef = doc(deliveredCol, item.id);
          batch.set(docRef, {
            id: item.id,
            driveFileId: item.driveFileId || '',
            name: item.name,
            thumbnailUrl: item.thumbnailUrl,
            fullUrl: item.fullUrl,
            downloadUrl: item.downloadUrl || item.fullUrl || '',
            batchType: item.batchType,
            creativeNotes: item.creativeNotes || 'Calibrado e finalizado por Dilson Ferreira',
            notes: item.notes || '',
            deliveredAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          }, { merge: true });
        }
        await batch.commit();
      }

      // Update project deliveredCount
      await updateDoc(doc(db, 'projects', projectId), {
        deliveredCount: deliveredItems.length,
        deliveredDriveFolderId: cleanFolderId,
        updatedAt: serverTimestamp()
      });

      setStatusMessage(`Sucesso! ${deliveredItems.length} foto(s) editadas sincronizadas na Área de Entrega.`);
      setTimeout(() => setStatusMessage(null), 4500);
    } catch (err: any) {
      console.error('Failed to sync delivered folder:', err);
      setStatusMessage(`Erro ao sincronizar pasta de entrega: ${err?.message || 'Erro'}`);
      setTimeout(() => setStatusMessage(null), 5000);
    } finally {
      setSyncingDelivered(false);
    }
  };

  // 5c. Synchronize 02 - SELECIONADAS folder with Approved / Selected proofs
  const handleSyncSelectedFolder = async (projectId: string, customFolderInput?: string) => {
    const projectToSync = projects.find(p => p.id === projectId);
    if (!projectToSync) return;

    setSyncingSelected(true);
    setStatusMessage('Buscando fotos na Pasta 02 - SELECIONADAS do Google Drive...');
    try {
      let activeToken = getAccessToken();
      if (!activeToken) {
        activeToken = await reconnectGoogleDrive();
        if (activeToken) setToken(activeToken);
      }

      if (!activeToken) {
        setStatusMessage('Não foi possível obter acesso ao Google Drive. Por favor, conecte sua conta Google.');
        setTimeout(() => setStatusMessage(null), 5000);
        return;
      }

      const rawFolder = customFolderInput || projectToSync.selectedDriveFolderId;
      const cleanFolderId = rawFolder ? extractDriveFolderId(rawFolder) : '';

      if (!cleanFolderId) {
        setStatusMessage('Pasta 02 - SELECIONADAS ainda não foi configurada. Configure o link ou código da pasta.');
        setTimeout(() => setStatusMessage(null), 4500);
        setIsEditProjectModalOpen(true);
        return;
      }

      setStatusMessage('Carregando fotos da Pasta 02 do Google Drive...');
      let selectedItems: Proof[] = [];
      try {
        selectedItems = await listFolderImages(cleanFolderId, activeToken, false);
      } catch (driveErr: any) {
        if (driveErr?.name === 'DriveAuthExpiredError') {
          setStatusMessage('Token do Google Drive expirou. Renovando credenciais...');
          activeToken = await reconnectGoogleDrive();
          if (activeToken) {
            setToken(activeToken);
            selectedItems = await listFolderImages(cleanFolderId, activeToken, false);
          } else {
            throw driveErr;
          }
        } else {
          throw driveErr;
        }
      }

      if (selectedItems.length === 0) {
        setStatusMessage('Nenhuma foto encontrada na Pasta 02 - SELECIONADAS do Google Drive. Verifique se o link/código está correto e com permissões.');
        setTimeout(() => setStatusMessage(null), 5000);
        return;
      }

      setStatusMessage(`Encontradas ${selectedItems.length} foto(s) na Pasta 02! Sincronizando com a seleção...`);

      // Match files with existing proofs in the project or insert them if placed directly in Pasta 02
      const proofsCol = collection(db, 'projects', projectId, 'proofs');
      const snap = await getDocs(proofsCol);
      const existingProofs: Proof[] = [];
      snap.forEach(d => existingProofs.push(d.data() as Proof));

      // Build fast lookup maps by driveFileId and normalized fileName
      const byNameMap = new Map<string, Proof>();
      const byDriveIdMap = new Map<string, Proof>();
      for (const p of existingProofs) {
        if (p.name) byNameMap.set(p.name.trim().toLowerCase(), p);
        if (p.driveFileId) byDriveIdMap.set(p.driveFileId, p);
      }

      const batchSize = 400;
      for (let i = 0; i < selectedItems.length; i += batchSize) {
        const batch = writeBatch(db);
        const chunk = selectedItems.slice(i, i + batchSize);

        for (const item of chunk) {
          const normName = item.name.trim().toLowerCase();
          const matched = byDriveIdMap.get(item.driveFileId) || byNameMap.get(normName);

          if (matched) {
            const docRef = doc(proofsCol, matched.id);
            batch.set(docRef, {
              isSelected: true,
              status: 'approved',
              updatedAt: serverTimestamp()
            }, { merge: true });
          } else {
            const docRef = doc(proofsCol, item.id);
            batch.set(docRef, {
              id: item.id,
              driveFileId: item.driveFileId || '',
              name: item.name,
              thumbnailUrl: item.thumbnailUrl,
              fullUrl: item.fullUrl,
              status: 'approved',
              isSelected: true,
              updatedAt: serverTimestamp()
            }, { merge: true });
          }
        }
        await batch.commit();
      }

      // Re-read proofs to accurately get updated selection count
      const updatedSnap = await getDocs(proofsCol);
      let totalSel = 0;
      let totalPrfs = 0;
      updatedSnap.forEach(d => {
        totalPrfs++;
        if (d.data().isSelected) totalSel++;
      });

      // Update project selectedCount & status
      await updateDoc(doc(db, 'projects', projectId), {
        selectedCount: totalSel,
        selectedDriveFolderId: cleanFolderId,
        status: ['uploaded', 'reviewing'].includes(projectToSync.status) ? 'approved' : projectToSync.status,
        updatedAt: serverTimestamp()
      });

      setStatusMessage(`Sucesso! ${selectedItems.length} foto(s) da Pasta 02 sincronizadas com a seleção do ensaio!`);
      setTimeout(() => setStatusMessage(null), 4500);
    } catch (err: any) {
      console.error('Failed to sync selected folder:', err);
      setStatusMessage(`Erro ao sincronizar Pasta 02: ${err?.message || 'Erro'}`);
      setTimeout(() => setStatusMessage(null), 5000);
    } finally {
      setSyncingSelected(false);
    }
  };

  // 6. Create photoshoot project
  const handleCreateProject = async (pData: any) => {
    const projectId = 'shoot_' + Date.now();
    setStatusMessage('Criando ensaio fotográfico no banco de dados...');
    try {
      const projectDocRef = doc(db, 'projects', projectId);
      await setDoc(projectDocRef, {
        id: projectId,
        clientName: pData.clientName,
        clientEmail: pData.clientEmail.trim().toLowerCase(),
        clientPhone: pData.clientPhone || '',
        projectName: pData.projectName,
        status: 'uploaded',
        driveFolderId: pData.driveFolderId,
        selectedDriveFolderId: pData.selectedDriveFolderId || '',
        deliveredDriveFolderId: pData.deliveredDriveFolderId || '',
        deliveryEstimate: pData.deliveryEstimate || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        selectedCount: 0,
        totalCount: 0,
        adminNotes: pData.adminNotes || '',
        priceEstimate: Number(pData.priceEstimate) || 0,
        contractedCount: Number(pData.contractedCount) || 10,
        bonusPhotosCount: Number(pData.bonusPhotosCount) || 0,
        extraPhotoPrice: pData.extraPhotoPrice !== undefined ? Number(pData.extraPhotoPrice) : 75,
        googleReviewUrl: pData.googleReviewUrl || '',
        sessionDate: new Date().toISOString().split('T')[0],
        sessionValue: Number(pData.priceEstimate) || 0,
        referralCode: `DILSON-${(pData.clientName || 'CLIENTE').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 10)}-25`,
        referredByCode: '',
        referralCreditsTotal: 0,
        referralCreditsUsed: 0,
        referralCount: 0
      });

      // Trigger automatic creation notification alert log
      const notifId = 'notif_' + Date.now();
      await setDoc(doc(db, 'projects', projectId, 'notifications', notifId), {
        id: notifId,
        title: 'Álbum de Provas Iniciado',
        message: `Seu álbum de ensaio "${pData.projectName}" foi configurado! Aguarde a sincronização dos arquivos pelo fotógrafo.`,
        type: 'status_change',
        createdAt: serverTimestamp(),
        read: false,
        recipientEmail: pData.clientEmail.trim().toLowerCase()
      });

      setIsCreateOpen(false);
      handleSelectActiveProject(projectId);
      setStatusMessage('Ensaio criado com sucesso! Buscando fotos da pasta do Drive...');
      
      // Auto-trigger sync
      await handleSyncDriveFolder(projectId);
    } catch (e: any) {
      console.error('Project creation failed:', e);
      setStatusMessage(`Erro ao cadastrar ensaio: ${e?.message || 'Verifique permissões do Firestore'}`);
      setTimeout(() => setStatusMessage(null), 5000);
    }
  };

  // Delete project
  const handleDeleteProject = async (projectId: string) => {
    try {
      await deleteDoc(doc(db, 'projects', projectId));
      if (activeProjectId === projectId) {
        handleSelectActiveProject(null);
      }
      setStatusMessage('Ensaio excluído com sucesso.');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (e: any) {
      console.error(e);
      setStatusMessage('Erro ao excluir ensaio.');
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  // 7. Client Proof Selections / Remarks Events
  const handleToggleSelectProof = async (proofId: string) => {
    if (!activeProjectId || !activeProject) return;
    
    // Only lock selections for the client once finalized.
    // Photographers (effectiveIsAdmin && !isPreviewAsClient) are NEVER locked out!
    const isClientSession = !effectiveIsAdmin || isPreviewAsClient;
    const isLocked = ['approved', 'editing', 'delivered'].includes(activeProject.status);
    if (isLocked && isClientSession) return;

    try {
      const proofToToggle = proofs.find(p => p.id === proofId);
      if (!proofToToggle) return;

      const updatedSelected = !proofToToggle.isSelected;
      const docRef = doc(db, 'projects', activeProjectId, 'proofs', proofId);
      
      await updateDoc(docRef, {
        isSelected: updatedSelected,
        status: updatedSelected ? 'approved' : 'pending',
        updatedAt: serverTimestamp()
      });

      // Recalculate approvals count
      const updatedProofs = proofs.map(p => p.id === proofId ? { ...p, isSelected: updatedSelected } : p);
      const selCount = updatedProofs.filter(p => p.isSelected).length;

      await updateDoc(doc(db, 'projects', activeProjectId), {
        selectedCount: selCount,
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      console.error('Approval select toggle error:', e);
    }
  };

  // Photographer Bonus / Gift Photo Toggle Handler
  const handleToggleBonusPhoto = async (proofId: string, customNote?: string) => {
    if (!activeProjectId || !activeProject) return;
    try {
      const proofToUpdate = proofs.find(p => p.id === proofId);
      if (!proofToUpdate) return;

      const defaultBonusMessage = "Essa eu curti demais e não poderia ficar de fora do projeto! 🎁";
      const willBeBonus = !proofToUpdate.isBonus;
      const docRef = doc(db, 'projects', activeProjectId, 'proofs', proofId);

      await updateDoc(docRef, {
        isBonus: willBeBonus,
        isSelected: willBeBonus ? true : proofToUpdate.isSelected,
        status: willBeBonus ? 'approved' : proofToUpdate.status,
        bonusNote: willBeBonus ? (customNote || defaultBonusMessage) : '',
        updatedAt: serverTimestamp()
      });

      // Recalculate selections and bonus counts
      const updatedProofs = proofs.map(p => p.id === proofId 
        ? { 
            ...p, 
            isBonus: willBeBonus, 
            isSelected: willBeBonus ? true : p.isSelected, 
            bonusNote: willBeBonus ? (customNote || defaultBonusMessage) : '' 
          } 
        : p
      );
      const selCount = updatedProofs.filter(p => p.isSelected).length;
      const bonusPhotosListCount = updatedProofs.filter(p => p.isBonus).length;
      const newBonusQuota = Math.max(activeProject.bonusPhotosCount || 0, bonusPhotosListCount);

      await updateDoc(doc(db, 'projects', activeProjectId), {
        selectedCount: selCount,
        bonusPhotosCount: newBonusQuota,
        updatedAt: serverTimestamp()
      });

      if (willBeBonus) {
        setStatusMessage('Foto incluída como Brinde do Fotógrafo! 🎁');
        // Notify client
        const notifId = 'notif_gift_' + Date.now();
        await setDoc(doc(db, 'projects', activeProjectId, 'notifications', notifId), {
          id: notifId,
          title: '🎁 Presente do Fotógrafo Dilson!',
          message: `Dilson Ferreira adicionou a foto "${proofToUpdate.name}" como brinde especial: "${customNote || defaultBonusMessage}"`,
          type: 'notes_added',
          createdAt: serverTimestamp(),
          read: false,
          recipientEmail: activeProject.clientEmail
        });
      } else {
        setStatusMessage('Status de foto brinde removido.');
      }
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (e: any) {
      console.error('Error toggling bonus photo:', e);
      setStatusMessage('Erro ao atualizar foto brinde: ' + (e?.message || 'Erro'));
      setTimeout(() => setStatusMessage(null), 3500);
    }
  };

  const handleUpdateNotesProof = async (proofId: string, notesText: string) => {
    if (!activeProjectId) return;
    try {
      const docRef = doc(db, 'projects', activeProjectId, 'proofs', proofId);
      await updateDoc(docRef, {
        clientNotes: notesText,
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      console.error(e);
    }
  };

  // Next/Prev scrolling controls inside zoomed overlay modal
  const handleScrollProof = (direction: 'next' | 'prev') => {
    if (!zoomedProof || proofs.length <= 1) return;
    const currIdx = proofs.findIndex(p => p.id === zoomedProof.id);
    let nextIdx = direction === 'next' ? currIdx + 1 : currIdx - 1;
    
    if (nextIdx >= proofs.length) nextIdx = 0;
    if (nextIdx < 0) nextIdx = proofs.length - 1;
    
    setZoomedProof(proofs[nextIdx]);
  };

  // 8. Workflows States Transitions Trigger (Client / Admin)
  const handleUpdateProjectStatus = async (projectId: string, newStatus: Project['status']) => {
    setStatusMessage('Atualizando fase do serviço...');
    try {
      await updateDoc(doc(db, 'projects', projectId), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });

      // Translation for logs
      const statusNames: Record<Project['status'], string> = {
        uploaded: 'Provas Carregadas',
        reviewing: 'Em Revisão pelo Cliente',
        approved: 'Lote de Seleção Confirmado',
        editing: 'Em Processamento de Edição',
        partial_delivered: 'Entrega Parcial de Fotos',
        delivered: 'Arquivos Finais Entregues'
      };

      // Create automatic notification alert log
      const notifId = 'notif_' + Date.now();
      const proj = projects.find(p => p.id === projectId);
      if (proj) {
        await setDoc(doc(db, 'projects', projectId, 'notifications', notifId), {
          id: notifId,
          title: 'Serviço de Edição Atualizado',
          message: `O status do ensaio "${proj.projectName}" avançou para: ${statusNames[newStatus]}.`,
          type: 'status_change',
          createdAt: serverTimestamp(),
          read: false,
          recipientEmail: proj.clientEmail
        });
      }

      setStatusMessage('Fase de serviço atualizada com sucesso.');
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (e) {
      console.error(e);
      setStatusMessage('Falha ao atualizar fase de andamento.');
    }
  };

  // Client Finalizes Approval and triggers automated Drive copy
  const handleOpenFinalizeModal = () => {
    if (!activeProject) return;
    const count = proofs.filter(p => p.isSelected).length;
    if (count === 0) {
      setStatusMessage('Selecione pelo menos 1 foto para homologar e finalizar seu lote.');
      setTimeout(() => setStatusMessage(null), 3500);
      return;
    }
    setIsFinalizeModalOpen(true);
  };

  const handleExecuteFinalizeBatch = async (
    finalNotes: string,
    onProgress: (done: number, total: number, fileName: string) => void
  ): Promise<{ successCount: number; driveCopied: boolean; error?: string }> => {
    if (!activeProjectId || !activeProject) {
      throw new Error('Nenhum projeto ativo selecionado');
    }

    const selectedProofs = proofs.filter(p => p.isSelected);
    const count = selectedProofs.length;
    if (count === 0) {
      throw new Error('Nenhuma foto selecionada');
    }

    // 1. Advance project status to 'approved' and save counts
    const projectUpdates: any = {
      status: 'approved',
      selectedCount: count,
      updatedAt: serverTimestamp()
    };
    if (finalNotes.trim()) {
      projectUpdates.clientFinalNotes = finalNotes.trim();
    }

    try {
      await updateDoc(doc(db, 'projects', activeProjectId), projectUpdates);
    } catch (dbErr) {
      console.error('Failed to update project status in Firestore:', dbErr);
      handleFirestoreError(dbErr, OperationType.UPDATE, `projects/${activeProjectId}`);
    }

    let driveCopied = false;
    let driveError = '';

    // 2. Automated Google Drive copy if target folder exists
    const activeDriveFolder = activeProject.selectedDriveFolderId?.trim();
    const driveAuthToken = token || getAccessToken();

    if (activeDriveFolder && driveAuthToken) {
      try {
        const copyRes = await copySelectedProofsToDriveFolder(
          selectedProofs,
          activeDriveFolder,
          driveAuthToken,
          onProgress
        );
        driveCopied = copyRes.success > 0;
        if (copyRes.failed > 0) {
          driveError = `${copyRes.failed} foto(s) não puderam ser copiadas.`;
        }
      } catch (copyErr: any) {
        console.warn('Drive copy in client finalization warning:', copyErr);
        driveError = copyErr?.message || 'Aviso de sincronização do Drive';
      }
    }

    // 3. Write notifications for Photographer and Client
    try {
      const notifId = 'notif_' + Date.now();
      await setDoc(doc(db, 'projects', activeProjectId, 'notifications', notifId), {
        id: notifId,
        title: 'Seleção Finalizada pelo Cliente!',
        message: `O cliente ${activeProject.clientName} homologou o lote selecionado com ${count} foto(s) para edição do ensaio "${activeProject.projectName}". ${driveCopied ? 'Arquivos copiados para a pasta 02 - SELECIONADAS do Drive.' : ''}`,
        type: 'approval',
        createdAt: serverTimestamp(),
        read: false,
        recipientEmail: 'contato@dilsonferreira.com.br'
      });

      const clientNotifId = 'notif_cls_' + (Date.now() + 1);
      await setDoc(doc(db, 'projects', activeProjectId, 'notifications', clientNotifId), {
        id: clientNotifId,
        title: 'Sua seleção foi homologada!',
        message: `Lote de ${count} foto(s) confirmado. Seus retoques e comentários foram salvos e enviados diretamente para o fluxo de pós-produção do fotógrafo Dilson Ferreira.`,
        type: 'system',
        createdAt: serverTimestamp(),
        read: false,
        recipientEmail: activeProject.clientEmail
      });
    } catch (notifErr) {
      console.warn('Notification writing warning in finalize:', notifErr);
    }

    // 4. Automatically activate the "Minhas Selecionadas" filter view
    setClientGalleryFilter('selected');
    setStatusMessage(`Lote com ${count} fotos homologado com sucesso!`);
    setTimeout(() => setStatusMessage(null), 4000);

    return {
      successCount: count,
      driveCopied,
      error: driveError || undefined
    };
  };

  // Adjust estimate configurations (Admin)
  const handleUpdatePriceOrEstimate = async (
    field: 'priceEstimate' | 'deliveryEstimate' | 'contractedCount' | 'extraPhotoPrice' | 'bonusPhotosCount', 
    value: any
  ) => {
    if (!activeProjectId) return;
    try {
      await updateDoc(doc(db, 'projects', activeProjectId), {
        [field]: value,
        updatedAt: serverTimestamp()
      });
      setStatusMessage('Configurações salvas!');
      setTimeout(() => setStatusMessage(null), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  // Comprehensive project and Google Drive folder editor handler
  const handleSaveProjectEdits = async (updatedData: Partial<Project>) => {
    if (!activeProjectId) return;
    setStatusMessage('Salvando alterações do projeto e pastas...');
    try {
      await updateDoc(doc(db, 'projects', activeProjectId), {
        ...updatedData,
        updatedAt: serverTimestamp()
      });
      setIsEditProjectModalOpen(false);
      setStatusMessage('Projeto e links atualizados com sucesso!');
      setTimeout(() => setStatusMessage(null), 3000);

      // If driveFolderId changed, re-sync raw proofs automatically
      if (updatedData.driveFolderId && updatedData.driveFolderId !== activeProject?.driveFolderId) {
        await handleSyncDriveFolder(activeProjectId, updatedData.driveFolderId);
      }
    } catch (e: any) {
      console.error('Failed to update project edits:', e);
      setStatusMessage(`Erro ao salvar alterações: ${e?.message || 'Erro'}`);
      setTimeout(() => setStatusMessage(null), 4000);
      throw e;
    }
  };

  // Clean custom notifications (reads)
  const handleMarkNotifRead = async (id: string) => {
    if (!activeProjectId) return;
    try {
      await updateDoc(doc(db, 'projects', activeProjectId, 'notifications', id), {
        read: true
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendCustomNotif = async () => {
    if (!activeProjectId || !adminCustomNotif.trim() || !activeProject) return;
    try {
      const notifId = 'notif_cust_' + Date.now();
      await setDoc(doc(db, 'projects', activeProjectId, 'notifications', notifId), {
        id: notifId,
        title: 'Alerta do Fotógrafo Dilson',
        message: adminCustomNotif,
        type: 'notes_added',
        createdAt: serverTimestamp(),
        read: false,
        recipientEmail: activeProject.clientEmail
      });
      setAdminCustomNotif('');
      setStatusMessage('Notificação enviada!');
      setTimeout(() => setStatusMessage(null), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenEditFolderModal = () => {
    if (!activeProject) return;
    setEditFolderInput(activeProject.driveFolderId || '');
    setEditSelectedFolderInput(activeProject.selectedDriveFolderId || '');
    setEditDeliveredFolderInput(activeProject.deliveredDriveFolderId || '');
    setIsEditingFolderModal(true);
  };

  const handleSaveDriveFolders = async () => {
    if (!activeProject) return;
    try {
      const cleanRaw = extractDriveFolderId(editFolderInput);
      const cleanSel = editSelectedFolderInput.trim() ? extractDriveFolderId(editSelectedFolderInput) : '';
      const cleanDel = editDeliveredFolderInput.trim() ? extractDriveFolderId(editDeliveredFolderInput) : '';

      await updateDoc(doc(db, 'projects', activeProject.id), {
        driveFolderId: cleanRaw,
        selectedDriveFolderId: cleanSel,
        deliveredDriveFolderId: cleanDel,
        updatedAt: serverTimestamp()
      });

      setIsEditingFolderModal(false);
      setStatusMessage('Pastas do Google Drive atualizadas com sucesso!');
      setTimeout(() => setStatusMessage(null), 3000);

      if (cleanRaw !== activeProject.driveFolderId) {
        await handleSyncDriveFolder(activeProject.id, cleanRaw);
      }
    } catch (e) {
      console.error('Failed to update drive folders:', e);
      setStatusMessage('Erro ao atualizar pastas do Google Drive.');
    }
  };

  const handleWorkspaceCopySelectedToDrive = async () => {
    if (!activeProject) return;
    if (!activeProject.selectedDriveFolderId) {
      handleOpenEditFolderModal();
      setStatusMessage('Por favor, configure o ID da Pasta de Fotos Selecionadas do Google Drive.');
      setTimeout(() => setStatusMessage(null), 3500);
      return;
    }

    const selectedProofs = proofs.filter(p => p.isSelected);
    if (selectedProofs.length === 0) {
      setStatusMessage('Nenhuma foto selecionada ainda pelo cliente.');
      setTimeout(() => setStatusMessage(null), 3000);
      return;
    }

    let activeToken = getAccessToken() || token;
    if (!activeToken || !isDriveTokenFresh()) {
      setStatusMessage('Renovando conexão com o Google Drive...');
      activeToken = await reconnectGoogleDrive();
      if (activeToken) setToken(activeToken);
    }
    if (!activeToken) {
      setStatusMessage('Token do Google Drive não encontrado. Clique em "Conectar Drive" no cabeçalho.');
      setTimeout(() => setStatusMessage(null), 4500);
      return;
    }

    setIsCopyingToDrive(true);
    setStatusMessage(`Copiando 1 de ${selectedProofs.length} fotos para o Google Drive...`);

    try {
      const res = await copySelectedProofsToDriveFolder(
        selectedProofs,
        activeProject.selectedDriveFolderId,
        activeToken,
        (done, total, fileName) => {
          setStatusMessage(`Copiando (${done}/${total}): ${fileName}...`);
        }
      );

      setStatusMessage(`Sucesso! ${res.success} foto(s) copiadas para a pasta do Google Drive.`);
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      console.error(err);
      setStatusMessage('Erro ao copiar fotos para o Google Drive: ' + (err?.message || 'Erro'));
      setTimeout(() => setStatusMessage(null), 4000);
    } finally {
      setIsCopyingToDrive(false);
    }
  };

  const handleCopyLightroomFilenames = () => {
    const selected = proofs.filter(p => p.isSelected);
    if (selected.length === 0) {
      alert('Nenhuma foto selecionada pelo cliente ainda.');
      return;
    }
    const names = selected.map(p => p.name).join(', ');
    navigator.clipboard.writeText(names);
    setStatusMessage(`${selected.length} nomes copiados para a área de transferência (Lightroom/Bridge)!`);
    setTimeout(() => setStatusMessage(null), 3000);
  };

  // Calc delivery estimate countdown display helper
  const renderDeliveryEstimateHeader = () => {
    if (!activeProject?.deliveryEstimate) return null;
    const est = new Date(activeProject.deliveryEstimate);
    const today = new Date();
    const diffTime = est.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return (
      <div className="bg-[#181818] border border-neutral-800 rounded-xl px-4 py-2.5 flex items-center gap-3">
        <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg shrink-0">
          <Clock className="w-4 h-4" />
        </div>
        <div>
          <span className="text-[9px] font-mono uppercase tracking-widest text-neutral-500 block leading-tight">RETA FINAL DE ENTREGA</span>
          <p className="text-xs font-bold text-neutral-200 leading-tight mt-0.5">
            {est.toLocaleDateString('pt-BR')} • {diffDays > 0 ? `Entrega em ${diffDays} dias` : diffDays === 0 ? 'Entrega hoje!' : 'Fase de pós-produção final'}
          </p>
        </div>
      </div>
    );
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#070707] text-white flex flex-col items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
          <p className="text-xs font-mono tracking-widest text-[#666] uppercase">Iniciando Dashboard...</p>
        </div>
      </div>
    );
  }

  // --- LOGIN BOARD SCREEN ---
  if (!user) {
    return (
      <div className="min-h-screen bg-stone-950 text-white flex flex-col items-center justify-center p-4 selection:bg-amber-500 selection:text-black">
        {/* Artistic background blur accents */}
        <div className="absolute top-1/4 left-1/4 w-[250px] h-[250px] bg-amber-500/5 rounded-full filter blur-[80px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[250px] h-[250px] bg-amber-500/5 rounded-full filter blur-[80px]" />

        <div className="w-full max-w-md bg-[#121212]/90 border border-neutral-800 p-8 rounded-3xl relative z-10 shadow-2xl text-center">
          <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mx-auto mb-6">
            <Camera className="w-6 h-6 stroke-[1.8]" />
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-white font-sans uppercase">
            Dilson Ferreira
          </h1>
          <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-mono font-medium mt-1">
            MÓDULO DE FOTOPROVAS & SELEÇÃO
          </p>

          <p className="text-xs text-neutral-400 mt-5 mb-8 leading-relaxed">
            Consulte o cronômetro de entregas, faça escolhas estéticas, anote observações de edição e decida em tempo real o retoque das suas provas integradas.
          </p>

          {/* Signin Button */}
          <button 
            onClick={handleLogin}
            className="w-full bg-[#181818] border border-neutral-800 hover:border-amber-500/40 text-neutral-100 hover:text-white rounded-xl py-3.5 px-4 flex items-center justify-center gap-3 transition-all hover:shadow-lg hover:shadow-amber-500/5 cursor-pointer font-sans"
          >
            {/* Standard Vector Google Badge icon */}
            <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-[18px] h-[18px] shrink-0">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
              <path fill="none" d="M0 0h48v48H0z"></path>
            </svg>
            <span className="text-sm font-semibold tracking-wide">Aprovar Ensaio com Conta Google</span>
          </button>

          <div className="border-t border-neutral-900 pt-5 mt-6">
            <p className="text-[10px] text-neutral-600 font-mono tracking-wide leading-relaxed">
              * Apenas contas autorizadas têm permissão para acessar os ensaios e pastas correspondentes da galeria de provas.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // --- AUTHENTICATED BOARD VIEWS ---
  return (
    <div className="min-h-screen bg-stone-950 text-neutral-100 font-sans relative selection:bg-amber-500 selection:text-black">
      {/* Visual Status Toast Strip representation */}
      {statusMessage && (
        <div className="fixed top-4 right-4 z-50 bg-[#121212] border border-amber-500/40 text-amber-500 text-xs px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 max-w-sm animate-fade-in font-sans">
          <Loader2 className="w-4 h-4 animate-spin text-amber-500 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Main Top Navigation Headboard */}
      <header className="sticky top-0 bg-[#0c0c0c]/95 border-b border-neutral-900/60 p-4 md:px-8 z-40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 text-amber-500 rounded-xl border border-amber-500/5">
              <Camera className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-white uppercase flex items-center gap-1.5 font-sans">
                Dilson Ferreira <span className="text-[9px] font-mono text-amber-500 bg-amber-500/10 py-0.5 px-1.5 rounded-full border border-amber-500/20 font-bold">PORTFOLIO</span>
              </h1>
              <p className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 mt-0.5">
                {effectiveIsAdmin ? 'ADMINISTRADOR DE PROVAS' : 'PAINEL DO CLIENTE'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Role switch toggle */}
            <div className="flex items-center bg-[#141414] p-1 rounded-xl border border-neutral-800">
              <button
                onClick={() => handleToggleViewRole('admin')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
                  viewRole === 'admin' && !isPreviewAsClient
                    ? 'bg-[#E85E26] text-white shadow-sm font-semibold'
                    : 'text-neutral-400 hover:text-white'
                }`}
                title="Acessar painel do fotógrafo Dilson Ferreira"
              >
                Fotógrafo
              </button>
              <button
                onClick={() => handleToggleViewRole('client')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
                  viewRole === 'client' || isPreviewAsClient
                    ? 'bg-amber-600 text-black font-bold shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
                title="Acessar visão de seleção do cliente"
              >
                Cliente
              </button>
            </div>

            {/* Google Drive Status badge */}
            <button
              onClick={handleReconnectDrive}
              className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-mono transition-all border cursor-pointer ${
                token && isDriveTokenFresh()
                  ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/50 hover:bg-emerald-900/50'
                  : 'bg-amber-950/40 text-amber-400 border-amber-800/60 hover:bg-amber-900/50 animate-pulse'
              }`}
              title={token && isDriveTokenFresh() ? 'Google Drive conectado. Clique para renovar se necessário.' : 'Clique para conectar e autorizar o Google Drive.'}
            >
              <Cloud className="w-3.5 h-3.5" />
              <span>{token && isDriveTokenFresh() ? 'Drive Conectado' : 'Conectar Drive'}</span>
              <RefreshCw className="w-3 h-3 opacity-60 hover:opacity-100" />
            </button>

            {/* Display profile avatar metadata */}
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-semibold text-neutral-100">{user.displayName || 'Cliente Autenticado'}</span>
              <span className="text-[10px] font-mono text-neutral-500">{user.email}</span>
            </div>
            {user.photoURL && (
              <img 
                src={user.photoURL} 
                alt="user avatar" 
                referrerPolicy="no-referrer"
                className="w-8 h-8 rounded-full border border-neutral-800"
              />
            )}

            <button 
              onClick={handleLogout}
              className="p-2 bg-neutral-900/60 hover:bg-neutral-800/80 text-neutral-400 hover:text-white rounded-xl border border-neutral-850 transition-all cursor-pointer"
              title="Sair da Conta"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 sm:p-6 md:p-8 space-y-8 min-h-[calc(100vh-140px)]">
        
        {/* --- PHOTOGRAPHER ADMIN PANEL SCENARIO --- */}
        {effectiveIsAdmin && !isPreviewAsClient ? (
          <div className="space-y-8">
            {!activeProjectId || !activeProject ? (
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-900 pb-5">
                  <div>
                    <h2 className="text-xl font-bold uppercase tracking-widest text-[#eee] font-sans flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-[#E85E26]" />
                      Painel Geral de Ensaios & Clientes
                    </h2>
                    <p className="text-xs text-neutral-500 mt-1">
                      Gerencie sessões de fotos integradas ao Google Drive, base de dados de seleções de clientes e andamento do fluxo de pós-produção.
                    </p>
                  </div>

                  {/* Tab Navigation */}
                  <div className="flex items-center gap-2 bg-[#121212] p-1.5 rounded-2xl border border-neutral-850 self-start md:self-auto">
                    <button
                      onClick={() => setAdminViewTab('cards')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono uppercase tracking-wider font-semibold transition-all cursor-pointer ${
                        adminViewTab === 'cards'
                          ? 'bg-[#E85E26] text-white shadow-md'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                      <span>Cards de Ensaios</span>
                      <span className="text-[10px] bg-black/30 px-1.5 py-0.5 rounded-full font-bold">
                        {projects.length}
                      </span>
                    </button>

                    <button
                      onClick={() => setAdminViewTab('database')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono uppercase tracking-wider font-semibold transition-all cursor-pointer ${
                        adminViewTab === 'database'
                          ? 'bg-[#E85E26] text-white shadow-md'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      <Table className="w-3.5 h-3.5" />
                      <span>Tabela de Seleções</span>
                      <span className="text-[10px] bg-black/30 px-1.5 py-0.5 rounded-full font-bold">
                        Base Clientes
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsReferralManagerOpen(true)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono uppercase tracking-wider font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 transition-all cursor-pointer shadow-sm ml-1"
                      title="Gerenciar indicações e créditos de cashback VIP"
                    >
                      <Award className="w-3.5 h-3.5 text-amber-400" />
                      <span>🏆 Clube de Indicações VIP</span>
                    </button>
                  </div>
                </div>

                {adminViewTab === 'cards' ? (
                  <ProjectListAdmin 
                    projects={projects}
                    onSelectProject={(id) => handleSelectActiveProject(id)}
                    onDeleteProject={handleDeleteProject}
                    onSyncDriveFolder={handleSyncDriveFolder}
                    onOpenCreateModal={() => setIsCreateOpen(true)}
                  />
                ) : (
                  <ClientSelectionsTable 
                    projects={projects}
                    onSelectProject={(id) => handleSelectActiveProject(id)}
                    onUpdateStatus={handleUpdateProjectStatus}
                    onRefreshDrive={handleSyncDriveFolder}
                  />
                )}
              </div>
            ) : (
              // ADMIN DETAILED WORKSPACE VIEW FOR SELECTED PROJECT
              <div className="space-y-6">
                 {/* Header back button & Client mode simulation trigger */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#111111]/60 border border-neutral-905 p-3 rounded-2xl">
                  <button
                    onClick={() => { handleSelectActiveProject(null); setActiveProject(null); }}
                    className="bg-[#121212] border border-neutral-900 text-neutral-400 hover:text-white px-4 py-2.5 rounded-xl text-xs font-mono font-medium flex items-center justify-center gap-2 transition-all hover:border-neutral-850 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4 stroke-[2.5]" /> Voltar à Lista Geral de Portfólios
                  </button>

                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => setIsReferralManagerOpen(true)}
                      className="bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 px-4 py-2.5 rounded-xl text-xs font-mono font-medium flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
                      title="Gerenciar indicações e créditos de cashback VIP deste cliente"
                    >
                      <Award className="w-4 h-4 text-amber-400" />
                      <span>🏆 Indicações & Cashback</span>
                    </button>

                    <button
                      onClick={() => setIsEditProjectModalOpen(true)}
                      className="bg-[#1c1c1c] hover:bg-[#252525] border border-neutral-800 hover:border-neutral-700 text-white px-4 py-2.5 rounded-xl text-xs font-mono font-medium flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
                      title="Editar nome do projeto, cliente, cota de fotos, brinde, valores e pastas do Google Drive"
                    >
                      <FolderEdit className="w-4 h-4 text-[#E85E26]" />
                      <span>Editar Projeto & Pastas</span>
                    </button>

                    <button
                      onClick={() => setIsPreviewAsClient(true)}
                      className="bg-amber-600/10 hover:bg-amber-600 text-amber-500 hover:text-black border border-amber-500/25 px-4.5 py-2.5 rounded-xl text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all cursor-pointer hover:shadow-lg hover:shadow-amber-500/10"
                      title="Simular visualização idêntica ao cliente para testar aprovações"
                    >
                      <UserCheck className="w-4 h-4 text-inherit" /> Simular Modo do Cliente
                    </button>
                  </div>
                </div>

                {activeProject && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Visual management card */}
                    <div className="lg:col-span-2 bg-[#141414] border border-neutral-900 rounded-3xl p-6 space-y-6">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-neutral-900 pb-5">
                        <div>
                          <span className="text-[10px] font-mono font-bold tracking-widest text-[#666] uppercase">EDITANDO MATRIZ DO CLIENTE</span>
                          <h2 className="text-2xl font-bold tracking-tight text-white mt-1">
                            {activeProject.projectName}
                          </h2>
                          <p className="text-xs text-neutral-500 flex items-center gap-1.5 mt-1.5 font-mono">
                            <Mail className="w-3.5 h-3.5" /> {activeProject.clientName} ({activeProject.clientEmail})
                          </p>
                        </div>

                        {/* Interactive flow adjuster */}
                        <div className="flex flex-wrap gap-2">
                          <span className="text-xs text-neutral-400 font-medium py-1">Estágio de Produção:</span>
                          <select
                            value={activeProject.status}
                            onChange={(e) => handleUpdateProjectStatus(activeProject.id, e.target.value as any)}
                            className="bg-[#0c0c0c] text-xs font-mono font-bold text-amber-500 px-3 py-1.5 rounded-xl border border-neutral-850 outline-none cursor-pointer focus:border-amber-500 uppercase"
                          >
                            <option value="uploaded">Fotomontagem Bruta</option>
                            <option value="reviewing">Revisão do Cliente</option>
                            <option value="approved">Seleção Aprovada</option>
                            <option value="editing">Polimento Estético</option>
                            <option value="partial_delivered">⚡ Entrega Parcial</option>
                            <option value="delivered">Imagens Finalizadas</option>
                          </select>
                        </div>
                      </div>

                      {/* Config panel block */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
                        <div className="bg-[#0c0c0c] border border-neutral-900 rounded-2xl p-4 flex flex-col justify-between">
                          <span className="text-[10px] font-mono text-neutral-500 font-bold uppercase tracking-widest">ORÇAMENTO BASE</span>
                          <div className="flex items-center gap-1 mt-3">
                            <span className="text-sm font-mono text-neutral-500">R$</span>
                            <input
                              type="number"
                              key={activeProject.id + '_price'}
                              defaultValue={activeProject.priceEstimate}
                              onBlur={(e) => handleUpdatePriceOrEstimate('priceEstimate', Number(e.target.value))}
                              className="bg-transparent text-xl font-mono font-bold text-white focus:outline-none focus:border-b focus:border-orange-500 w-full"
                            />
                          </div>
                          <p className="text-[9px] text-neutral-600 mt-2">Valor fixo do pacote base.</p>
                        </div>

                        <div className="bg-[#0c0c0c] border border-neutral-900 rounded-2xl p-4 flex flex-col justify-between">
                          <span className="text-[10px] font-mono text-neutral-500 font-bold uppercase tracking-widest">CONTRATADAS</span>
                          <div className="flex items-center gap-1 mt-3 font-mono">
                            <input
                              type="number"
                              min="1"
                              key={activeProject.id + '_contracted'}
                              defaultValue={activeProject.contractedCount || 10}
                              onBlur={(e) => handleUpdatePriceOrEstimate('contractedCount', Number(e.target.value))}
                              className="bg-transparent text-xl font-mono font-bold text-orange-500 focus:outline-none focus:border-b focus:border-orange-500 w-full"
                            />
                            <span className="text-xs text-neutral-500 font-sans">limite</span>
                          </div>
                          <p className="text-[9px] text-neutral-600 mt-2">Limite do pacote base.</p>
                        </div>

                        <div className="bg-[#0c0c0c] border border-amber-500/20 bg-amber-500/[0.02] rounded-2xl p-4 flex flex-col justify-between">
                          <span className="text-[10px] font-mono text-amber-400 font-bold uppercase tracking-widest flex items-center gap-1">
                            <Gift className="w-3 h-3 text-amber-400" /> BRINDE / CORTESIA
                          </span>
                          <div className="flex items-center gap-1 mt-3 font-mono">
                            <input
                              type="number"
                              min="0"
                              key={activeProject.id + '_bonus'}
                              defaultValue={activeProject.bonusPhotosCount || 0}
                              onBlur={(e) => handleUpdatePriceOrEstimate('bonusPhotosCount', Number(e.target.value))}
                              className="bg-transparent text-xl font-mono font-bold text-amber-400 focus:outline-none focus:border-b focus:border-amber-400 w-full"
                            />
                            <span className="text-xs text-neutral-500 font-sans">fotos</span>
                          </div>
                          <p className="text-[9px] text-neutral-500 mt-2">Fotos gratuitas adicionadas.</p>
                        </div>

                        <div className="bg-[#0c0c0c] border border-neutral-900 rounded-2xl p-4 flex flex-col justify-between">
                          <span className="text-[10px] font-mono text-orange-500 font-bold uppercase tracking-widest">VALOR EXTRA</span>
                          <div className="flex items-center gap-1 mt-3 font-mono">
                            <span className="text-sm font-mono text-neutral-500">R$</span>
                            <input
                              type="number"
                              min="0"
                              key={activeProject.id + '_extra_photo_price'}
                              defaultValue={activeProject.extraPhotoPrice !== undefined ? activeProject.extraPhotoPrice : 75}
                              onBlur={(e) => handleUpdatePriceOrEstimate('extraPhotoPrice', Number(e.target.value))}
                              className="bg-transparent text-xl font-mono font-bold text-orange-500 focus:outline-none focus:border-b focus:border-orange-500 w-full"
                            />
                          </div>
                          <p className="text-[9px] text-neutral-600 mt-2">Valor unitário da foto extra.</p>
                        </div>

                        <div className="bg-[#0c0c0c] border border-neutral-900 rounded-2xl p-4 flex flex-col justify-between">
                          <span className="text-[10px] font-mono text-neutral-500 font-bold uppercase tracking-widest">PREVISÃO ENTREGA</span>
                          <input
                            type="date"
                            key={activeProject.id + '_delivery'}
                            defaultValue={activeProject.deliveryEstimate}
                            onChange={(e) => handleUpdatePriceOrEstimate('deliveryEstimate', e.target.value)}
                            className="bg-transparent text-[11px] font-mono font-bold text-white focus:outline-none focus:border-b focus:border-orange-500 w-full mt-3 cursor-pointer"
                          />
                          <p className="text-[9px] text-neutral-600 mt-3">Previsão da pós-produção.</p>
                        </div>

                        {/* Live Total Cost Board */}
                        {(() => {
                          const freeLimit = (activeProject.contractedCount || 10) + (activeProject.bonusPhotosCount || 0);
                          const extraCount = Math.max(0, (activeProject.selectedCount || 0) - freeLimit);
                          const extraUnit = activeProject.extraPhotoPrice !== undefined ? activeProject.extraPhotoPrice : 75;
                          const totalEst = (activeProject.priceEstimate || 0) + (extraCount * extraUnit);
                          return (
                            <div className="bg-[#0c0c0c] border border-orange-500/20 rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden">
                              <div className="absolute top-0 right-0 w-8 h-8 bg-orange-500/5 rounded-full filter blur-xl" />
                              <span className="text-[10px] font-mono text-orange-500 font-bold uppercase tracking-widest">FATURAMENTO TOTAL</span>
                              <div className="mt-3">
                                <span className="text-[10px] font-mono text-neutral-500 block">TOTAL ESTIMADO</span>
                                <span className="text-lg font-mono font-bold text-orange-500">
                                  R$ {totalEst.toLocaleString('pt-BR')}
                                </span>
                              </div>
                              <p className="text-[9px] text-neutral-400 mt-2 leading-tight">
                                {activeProject.selectedCount} sel. • {extraCount} extra(s)
                                {(activeProject.bonusPhotosCount || 0) > 0 && ` • +${activeProject.bonusPhotosCount} brinde`}
                              </p>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Stepper display */}
                      <StatusTracker currentStatus={activeProject.status} />
                    </div>

                    {/* Notification send trigger for the administrative user */}
                    <div className="bg-[#141414] border border-neutral-900 rounded-3xl p-6 flex flex-col justify-between space-y-4">
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 border-b border-neutral-900 pb-3">
                          <Bell className="w-4 h-4 text-amber-500" />
                          <h3 className="text-sm font-semibold tracking-wide text-white">Alerta Rápido para Cliente</h3>
                        </div>
                        <p className="text-xs text-neutral-500 leading-relaxed">
                          Envie um aviso manual que aparecerá no histórico e fluxo de e-mails de seleção do cliente para este álbum.
                        </p>
                        <textarea
                          placeholder="Ex: Adicionado retoque facial extra. Aguardo conclusão do lote das fotos selecionadas."
                          value={adminCustomNotif}
                          onChange={(e) => setAdminCustomNotif(e.target.value)}
                          rows={4}
                          className="w-full bg-[#0c0c0c] text-xs text-neutral-200 border border-neutral-900 rounded-xl p-3 focus:outline-none focus:border-amber-500/40 resize-none font-sans"
                        />
                      </div>
                      <button
                        onClick={handleSendCustomNotif}
                        className="bg-[#1c1c1c] hover:bg-amber-600 hover:text-black hover:border-amber-500 border border-neutral-850 text-amber-500 text-xs font-mono font-bold uppercase tracking-widest p-3 rounded-xl transition-all flex items-center justify-center gap-2"
                      >
                        <Send className="w-3.5 h-3.5" /> Enviar Mensagem Notificação
                      </button>
                    </div>
                  </div>
                )}

                {/* Main Tab Navigation: 01 - Provas | 02 - Selecionadas | 03 - Área de Entrega */}
                <div className="flex flex-wrap items-center gap-2 border-b border-neutral-900 pb-3">
                  {/* 01 - Provas */}
                  <button
                    type="button"
                    onClick={() => setProjectMainTab('proofs')}
                    className={`px-4 py-2.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
                      projectMainTab === 'proofs'
                        ? 'bg-neutral-800 text-white border border-neutral-700 shadow-md'
                        : 'text-neutral-400 hover:text-white hover:bg-neutral-900/60 border border-neutral-850'
                    }`}
                  >
                    <Camera className="w-4 h-4 text-amber-500" />
                    <span>01 - Provas do Ensaio (Pasta 01)</span>
                    <span className="bg-neutral-900 text-[10px] px-2 py-0.5 rounded-full text-neutral-300 font-sans">
                      {proofs.length}
                    </span>
                  </button>

                  {/* 02 - Selecionadas */}
                  <button
                    type="button"
                    onClick={() => setProjectMainTab('selected')}
                    className={`px-4 py-2.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
                      projectMainTab === 'selected'
                        ? 'bg-emerald-600 text-black border border-emerald-500 shadow-md font-bold'
                        : 'text-neutral-400 hover:text-white hover:bg-neutral-900/60 border border-neutral-850'
                    }`}
                  >
                    <FolderCheck className="w-4 h-4 text-inherit" />
                    <span>02 - Fotos Selecionadas (Pasta 02)</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-sans font-bold ${
                      projectMainTab === 'selected' ? 'bg-black/30 text-white' : 'bg-neutral-900 text-neutral-300'
                    }`}>
                      {proofs.filter(p => p.isSelected).length}
                    </span>
                    {(activeProject.bonusPhotosCount || 0) > 0 && (
                      <span className="text-[9px] bg-black/40 text-amber-300 px-1.5 py-0.5 rounded-full font-bold">
                        🎁 +{activeProject.bonusPhotosCount} brinde
                      </span>
                    )}
                  </button>

                  {/* 03 - Entrega & IA */}
                  <button
                    type="button"
                    onClick={() => setProjectMainTab('delivered')}
                    className={`px-4 py-2.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
                      projectMainTab === 'delivered'
                        ? 'bg-[#E85E26] text-white shadow-lg shadow-orange-950/40'
                        : 'text-neutral-400 hover:text-white hover:bg-neutral-900/60 border border-neutral-850'
                    }`}
                  >
                    <Sparkles className="w-4 h-4 text-white" />
                    <span>03 - Área de Entrega & Fotos Finais (03 - EDITADAS)</span>
                    <span className="bg-black/30 text-[10px] px-2 py-0.5 rounded-full font-sans font-bold">
                      {deliveredProofs.length}
                    </span>
                    {activeProject.status === 'partial_delivered' && (
                      <span className="bg-amber-400 text-black text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">
                        Parcial
                      </span>
                    )}
                    {activeProject.status === 'delivered' && (
                      <span className="bg-emerald-400 text-black text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">
                        Concluída
                      </span>
                    )}
                  </button>
                </div>

                {projectMainTab === 'delivered' ? (
                  <DeliveredMaterialHub
                    project={activeProject}
                    deliveredProofs={deliveredProofs}
                    approvedProofs={proofs.filter(p => p.isSelected)}
                    token={token || getAccessToken()}
                    isAdmin={effectiveIsAdmin}
                    onSyncDeliveredFolder={() => handleSyncDeliveredFolder(activeProject.id)}
                    onOpenZoom={(p) => setZoomedProof(p)}
                    onUpdateStatus={(newSt) => handleUpdateProjectStatus(activeProject.id, newSt)}
                    onOpenEditProjectModal={() => setIsEditProjectModalOpen(true)}
                  />
                ) : projectMainTab === 'selected' ? (
                  <SelectedProofsHub
                    project={activeProject}
                    selectedProofs={proofs.filter(p => p.isSelected)}
                    allProofsCount={proofs.length}
                    isAdmin={effectiveIsAdmin}
                    onOpenZoom={(p) => setZoomedProof(p)}
                    onSyncSelectedFolder={() => handleSyncSelectedFolder(activeProject.id)}
                    isSyncingSelected={syncingSelected}
                    onCopyToDrive={handleWorkspaceCopySelectedToDrive}
                    isCopyingToDrive={isCopyingToDrive}
                    onGoToProofsTab={() => setProjectMainTab('proofs')}
                    onEditProject={() => setIsEditProjectModalOpen(true)}
                  />
                ) : (
                  /* Proof photos list in admin workspace panel */
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#111111]/80 border border-neutral-900 p-4 rounded-2xl">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-white tracking-wide">
                            Lote de Provas Sincronizadas ({proofs.length})
                          </h3>
                          {proofs.length > 0 && (
                            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-full font-bold">
                              {proofs.length} FOTOS
                            </span>
                          )}
                        </div>

                        {/* Folder links and statuses */}
                        <div className="flex flex-wrap items-center gap-2.5 mt-2 text-xs">
                          {/* 1. Raw / Proofs */}
                          <div className="flex items-center gap-1.5 bg-[#0e0e0e] px-2.5 py-1 rounded-lg border border-neutral-800 font-mono text-[11px]">
                            <span className="text-neutral-500 font-bold uppercase text-[9px]">Brutas:</span>
                            <a 
                              href={getDriveFolderUrl(activeProject?.driveFolderId)} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="text-[#E85E26] hover:underline flex items-center gap-1 font-semibold"
                              title="Abrir pasta de provas no Google Drive"
                            >
                              <span>Drive</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          </div>

                          {/* 2. Selected */}
                          <div className="flex items-center gap-1.5 bg-[#0e0e0e] px-2.5 py-1 rounded-lg border border-neutral-800 font-mono text-[11px]">
                            <span className="text-emerald-400 font-bold uppercase text-[9px]">Selecionadas:</span>
                            {activeProject?.selectedDriveFolderId ? (
                              <a 
                                href={getDriveFolderUrl(activeProject?.selectedDriveFolderId)} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="text-emerald-400 hover:underline flex items-center gap-1 font-semibold"
                                title="Abrir pasta de selecionadas no Google Drive"
                              >
                                <span>Drive</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            ) : (
                              <span className="text-neutral-600 italic">Não configurada</span>
                            )}
                          </div>

                          {/* 3. Delivered */}
                          <div className="flex items-center gap-1.5 bg-[#0e0e0e] px-2.5 py-1 rounded-lg border border-neutral-800 font-mono text-[11px]">
                            <span className="text-sky-400 font-bold uppercase text-[9px]">Entrega Final:</span>
                            {activeProject?.deliveredDriveFolderId ? (
                              <a 
                                href={getDriveFolderUrl(activeProject?.deliveredDriveFolderId)} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="text-sky-400 hover:underline flex items-center gap-1 font-semibold"
                                title="Abrir pasta de entrega final no Google Drive"
                              >
                                <span>Drive</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            ) : (
                              <span className="text-neutral-600 italic">Não configurada</span>
                            )}
                          </div>

                          <button
                            onClick={handleOpenEditFolderModal}
                            className="text-[11px] text-[#E85E26] hover:text-[#ff7236] underline font-mono flex items-center gap-1 cursor-pointer"
                          >
                            <FolderEdit className="w-3 h-3" /> Configurar Pastas
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                        {/* Copy Lightroom names */}
                        <button
                          onClick={handleCopyLightroomFilenames}
                          className="bg-[#1c1c1c] hover:bg-neutral-800 border border-neutral-800 text-neutral-300 text-xs font-mono uppercase tracking-wider px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                          title="Copia os nomes de arquivos das fotos selecionadas separados por vírgula para colar no filtro do Lightroom ou Bridge"
                        >
                          <Copy className="w-3.5 h-3.5 text-[#E85E26]" />
                          <span>Nomes p/ Lightroom</span>
                        </button>

                        {/* Sincronizar Pasta 02 (Fotos Selecionadas) */}
                        <button
                          onClick={() => activeProject && handleSyncSelectedFolder(activeProject.id)}
                          disabled={syncingSelected}
                          className="bg-emerald-600 hover:bg-emerald-500 text-black text-xs font-mono font-bold uppercase tracking-wider px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
                          title="Sincroniza as fotos que a cliente já colocou na Pasta 02 do Google Drive"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${syncingSelected ? 'animate-spin' : ''}`} />
                          <span>{syncingSelected ? 'Sincronizando 02...' : 'Sincronizar Pasta 02 (Drive)'}</span>
                        </button>

                        <button
                          onClick={() => activeProject && handleSyncDriveFolder(activeProject.id)}
                          disabled={syncingFolder}
                          className="bg-[#E85E26] hover:bg-[#ff7236] text-white text-xs font-mono font-bold uppercase tracking-wider px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                          title="Busca e sincroniza todos os 191 arquivos do Google Drive"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${syncingFolder ? 'animate-spin' : ''}`} />
                          {syncingFolder ? 'Sincronizando...' : 'Sincronizar Google Drive'}
                        </button>
                      </div>
                    </div>

                    {/* Alert banner if only 1 photo exists */}
                    {proofs.length <= 1 && (
                      <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in">
                        <div className="flex items-center gap-3">
                          <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0" />
                          <div>
                            <p className="text-xs font-bold text-amber-400 uppercase tracking-wide">
                              {proofs.length === 1 ? 'Apenas 1 foto carregada no momento' : 'Nenhuma foto sincronizada ainda'}
                            </p>
                            <p className="text-[11px] text-neutral-300 mt-0.5 leading-relaxed">
                              Se a sua pasta no Google Drive contém 191 arquivos, clique em sincronizar para carregar todos os 191 arquivos (inclui busca automática em subpastas, arquivos RAW, CR2, CR3, ARW, DNG e JPG).
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => activeProject && handleSyncDriveFolder(activeProject.id)}
                          disabled={syncingFolder}
                          className="bg-amber-500 hover:bg-amber-400 text-black text-xs font-mono font-bold uppercase tracking-wider px-5 py-2.5 rounded-xl transition-all flex items-center gap-2 shrink-0 cursor-pointer shadow-lg disabled:opacity-50"
                        >
                          <RefreshCw className={`w-4 h-4 ${syncingFolder ? 'animate-spin' : ''}`} />
                          {syncingFolder ? 'Sincronizando 191 Fotos...' : 'Sincronizar Todas as 191 Fotos'}
                        </button>
                      </div>
                    )}

                    {proofs.length === 0 ? (
                      <div className="bg-[#121212] border border-neutral-900/40 rounded-3xl py-12 text-center text-neutral-600 flex flex-col items-center justify-center gap-1.5">
                        <FolderSync className="w-8 h-8 opacity-40 animate-pulse mb-1.5 text-amber-500" />
                        <p className="text-xs font-semibold">Sem fotos neste projeto fotográfico.</p>
                        <button
                          onClick={() => activeProject && handleSyncDriveFolder(activeProject.id)}
                          className="bg-amber-600 hover:bg-amber-500 text-black text-[10px] font-mono font-bold py-1.5 px-3 rounded-lg uppercase mt-2"
                        >
                          Sincronizar Google Drive Agora
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {proofs.map((proof) => (
                          <ImageProofCard 
                            key={proof.id}
                            proof={proof}
                            onToggleSelect={handleToggleSelectProof}
                            onUpdateNotes={handleUpdateNotesProof}
                            onZoom={(p) => setZoomedProof(p)}
                            statusLock={false}
                            isAdmin={true}
                            onToggleBonus={handleToggleBonusPhoto}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          
          // --- CLIENT SERVICE DASHBOARD PANEL SCENARIO ---
          <div className="space-y-8">
            {activeProject ? (
              <div className="space-y-8">
                {effectiveIsAdmin && isPreviewAsClient && (
                  <div className="bg-amber-500/10 border border-amber-500/30 text-amber-500 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <Shield className="w-5 h-5 text-amber-500 animate-pulse shrink-0" />
                      <div>
                        <p className="text-xs font-bold font-mono uppercase tracking-wider">Modo Simulação do Cliente Ativo</p>
                        <p className="text-[10px] text-neutral-400">Você está navegando exatamente com a mesma interface e visão interativa do seu cliente.</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setIsPreviewAsClient(false)}
                      className="bg-amber-600 hover:bg-amber-500 text-black text-xs font-mono font-bold uppercase tracking-widest px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-lg"
                    >
                      Voltar ao Painel Corporativo
                    </button>
                  </div>
                )}
                {/* Introduction of Photoshoot Concept with Title on Top and Action Buttons Below */}
                <div className={`flex flex-col gap-6 p-6 md:p-8 rounded-3xl relative overflow-hidden transition-all duration-700 ${
                  ['delivered', 'extras_cashback'].includes(projectMainTab)
                    ? 'bg-gradient-to-br from-[#E85E26] via-[#ea580c] to-[#c2410c] text-white border-2 border-orange-300/70 shadow-2xl shadow-orange-950/60'
                    : 'bg-[#141414] border border-neutral-900'
                }`}>
                  {/* Celebratory ambient glow in layout */}
                  <div className={`absolute top-0 right-0 rounded-full filter blur-3xl pointer-events-none transition-all duration-700 ${
                    ['delivered', 'extras_cashback'].includes(projectMainTab)
                      ? 'w-[500px] h-[500px] bg-gradient-to-br from-amber-300/25 via-white/10 to-transparent'
                      : 'w-[200px] h-[200px] bg-amber-500/5'
                  }`} />
                  
                  {/* Top: Service Title and Client Metadata (spans full width, 1-2 lines max) */}
                  <div className="w-full relative z-10">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className={`text-[10px] font-mono tracking-widest font-black uppercase px-3 py-1 rounded-full shadow-sm ${
                        ['delivered', 'extras_cashback'].includes(projectMainTab)
                          ? 'bg-white text-black'
                          : 'text-[#E85E26] bg-[#E85E26]/10 border border-[#E85E26]/30'
                      }`}>
                        GALERIA DE PROVAS E ENTREGA DO CLIENTE
                      </span>
                      {['delivered', 'extras_cashback'].includes(projectMainTab) && (
                        <>
                          <span className="text-[10px] font-mono font-black bg-emerald-400 text-black px-3 py-1 rounded-full uppercase shadow-md border border-emerald-300 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-black" />
                            25% CASHBACK VIP LIBERADO
                          </span>
                          <span className="text-[10px] font-mono font-bold text-white bg-black/60 px-3 py-1 rounded-full border border-black/40 uppercase">
                            FASE DE ENTREGA
                          </span>
                        </>
                      )}
                    </div>
                    <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight leading-tight break-words drop-shadow-sm">
                      {activeProject.projectName}
                    </h2>
                    <div className={`text-xs mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 font-mono ${
                      ['delivered', 'extras_cashback'].includes(projectMainTab)
                        ? 'text-white/95 font-medium'
                        : 'text-neutral-400'
                    }`}>
                      <span>Proponente: <strong className={['delivered', 'extras_cashback'].includes(projectMainTab) ? 'text-white font-black underline' : 'text-neutral-200'}>{activeProject.clientName}</strong></span>
                      <span className={['delivered', 'extras_cashback'].includes(projectMainTab) ? 'text-white/40' : 'text-neutral-700'}>•</span>
                      <span>Status do Projeto: <strong className={`uppercase font-bold px-2 py-0.5 rounded text-[11px] ${
                        ['delivered', 'extras_cashback'].includes(projectMainTab)
                          ? 'bg-black text-emerald-400 border border-black/40'
                          : 'text-[#E85E26]'
                      }`}>{activeProject.status}</strong></span>
                      {(activeProject.bonusPhotosCount || 0) > 0 && (
                        <>
                          <span className={['delivered', 'extras_cashback'].includes(projectMainTab) ? 'text-white/40' : 'text-neutral-700'}>•</span>
                          <span className={['delivered', 'extras_cashback'].includes(projectMainTab) ? 'bg-white text-black font-black px-2 py-0.5 rounded text-[11px] shadow-sm' : 'text-amber-400 font-semibold'}>
                            🎁 +{activeProject.bonusPhotosCount} foto(s) de brinde
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Bottom: Action Buttons row underneath the title */}
                  <div className={`flex flex-wrap items-center gap-3 w-full pt-4 relative z-10 ${
                    ['delivered', 'extras_cashback'].includes(projectMainTab)
                      ? 'border-t border-white/20'
                      : 'border-t border-neutral-900'
                  }`}>
                    {renderDeliveryEstimateHeader()}

                    {/* Quick Delivered Hub Toggle button */}
                    <button
                      type="button"
                      onClick={() => setProjectMainTab(projectMainTab === 'delivered' ? 'proofs' : 'delivered')}
                      className={`font-mono text-xs font-black uppercase tracking-wider px-5 py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xl ${
                        projectMainTab === 'delivered'
                          ? 'bg-black text-white border-2 border-black hover:bg-neutral-900'
                          : ['delivered', 'extras_cashback'].includes(projectMainTab)
                          ? 'bg-white hover:bg-neutral-100 text-black'
                          : 'bg-[#E85E26] hover:bg-[#ff7236] text-white shadow-orange-950/30'
                      }`}
                    >
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                      <span>{projectMainTab === 'delivered' ? 'Ver Provas (01)' : `Área de Entrega (${deliveredProofs.length})`}</span>
                    </button>

                    {/* Final Delivered photos Drive link for client */}
                    {activeProject.deliveredDriveFolderId && (
                      <a
                        href={getDriveFolderUrl(activeProject.deliveredDriveFolderId)}
                        target="_blank"
                        rel="noreferrer"
                        className={`font-black font-mono text-xs uppercase tracking-widest px-5 py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-xl transition-all ${
                          ['delivered', 'extras_cashback'].includes(projectMainTab)
                            ? 'bg-emerald-400 hover:bg-emerald-300 text-black shadow-emerald-950/40'
                            : 'bg-emerald-600 hover:bg-emerald-500 text-black'
                        }`}
                      >
                        <ExternalLink className="w-4 h-4 stroke-[2.5]" /> Baixar Fotos Finais (Drive)
                      </a>
                    )}

                    {/* Quick Extras & Cashback button */}
                    <button
                      type="button"
                      onClick={() => setProjectMainTab(projectMainTab === 'extras_cashback' ? 'proofs' : 'extras_cashback')}
                      className={`font-mono text-xs font-black uppercase tracking-wider px-5 py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xl ${
                        projectMainTab === 'extras_cashback'
                          ? 'bg-black text-emerald-400 border-2 border-black hover:bg-neutral-900'
                          : ['delivered', 'extras_cashback'].includes(projectMainTab)
                          ? 'bg-black/80 hover:bg-black text-white border border-white/20'
                          : 'bg-[#181818] hover:bg-neutral-800 text-orange-400 border border-orange-500/30'
                      }`}
                    >
                      <Gift className="w-4 h-4 text-emerald-400" />
                      <span>Fotos Extras & Cashback 25%</span>
                    </button>
                    
                    {/* Primary selection checkout logic button */}
                    {['uploaded', 'reviewing'].includes(activeProject.status) ? (
                      <button
                        type="button"
                        onClick={handleOpenFinalizeModal}
                        className="bg-[#E85E26] hover:bg-[#ff7236] text-white font-bold font-mono text-xs uppercase tracking-widest px-6 py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-orange-950/20 active:scale-95 transition-all scroll-smooth cursor-pointer"
                      >
                        <FileCheck className="w-4 h-4 stroke-[3]" /> Finalizar Lote Selecionado ({proofs.filter(p => p.isSelected).length})
                      </button>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2.5">
                        <div className="bg-emerald-950/40 border border-emerald-900/50 rounded-xl px-4 py-2.5 flex items-center gap-3">
                          <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                          <div>
                            <p className="text-xs font-bold text-emerald-400 font-mono uppercase tracking-wider">Lote Homologado!</p>
                            <p className="text-[10px] text-neutral-400 mt-0.5">{activeProject.selectedCount} fotos em pós-produção</p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setProjectMainTab('proofs');
                            setClientGalleryFilter('selected');
                          }}
                          className="bg-neutral-900 hover:bg-neutral-850 text-white border border-neutral-800 text-xs font-mono font-semibold px-4 py-3 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
                        >
                          <Eye className="w-4 h-4 text-[#E85E26]" />
                          <span>Ver Minhas Selecionadas</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Delivery Announcement Callout Banner - Laranja Festivo com Escritos Brancos, Pretos e Verdes */}
                {['partial_delivered', 'delivered'].includes(activeProject.status) && (
                  <div className="bg-gradient-to-r from-[#E85E26] via-[#ea580c] to-[#c2410c] border-2 border-orange-300/50 rounded-2xl p-5 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 shadow-2xl shadow-orange-950/50 text-white relative overflow-hidden">
                    <div className="flex items-center gap-4 relative z-10">
                      <div className="p-3.5 bg-black text-emerald-400 rounded-2xl border border-black/40 shrink-0 shadow-lg">
                        <Sparkles className="w-6 h-6 text-emerald-400 stroke-[2.5]" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-black text-white font-mono uppercase tracking-wider drop-shadow-sm">
                            {activeProject.status === 'partial_delivered'
                              ? '⚡ Entrega Parcial Disponibilizada!'
                              : '🎉 Álbum Finalizado & Entregue!'}
                          </p>
                          <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full font-black bg-white text-black uppercase shadow-sm">
                            {deliveredProofs.length} Foto(s) na Pasta 03
                          </span>
                          <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full font-black bg-emerald-400 text-black uppercase shadow-sm border border-emerald-300">
                            💰 +25% Cashback Liberado
                          </span>
                        </div>
                        <p className="text-xs text-white/95 mt-1 leading-relaxed font-medium">
                          Seu material editado pelo fotógrafo Dilson Ferreira está disponível. Baixe em alta definição e aproveite o <strong>Cashback de 25%</strong> para novos ensaios ou para indicar amigos e zerar sua próxima sessão!
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 w-full md:w-auto relative z-10 shrink-0">
                      <button
                        type="button"
                        onClick={() => setProjectMainTab('delivered')}
                        className="flex-1 md:flex-none px-6 py-3.5 bg-black hover:bg-neutral-900 text-white font-mono text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-xl cursor-pointer flex items-center justify-center gap-2"
                      >
                        <Sparkles className="w-4 h-4 text-emerald-400" />
                        <span>{projectMainTab === 'delivered' ? 'Você está na Entrega' : 'Abrir Área de Entrega'}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Sub-panels grids for status progress tracker & logs */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    <StatusTracker currentStatus={activeProject.status} />
                  </div>
                  <div>
                    <NotificationPanel 
                      notifications={notifications}
                      onMarkAsRead={handleMarkNotifRead}
                    />
                  </div>
                </div>

                {/* Main Client Tab Switcher */}
                <div className="flex flex-wrap items-center gap-2 border-b border-neutral-900 pb-3">
                  {/* 01 - Provas */}
                  <button
                    type="button"
                    onClick={() => setProjectMainTab('proofs')}
                    className={`px-4 py-2.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
                      projectMainTab === 'proofs'
                        ? 'bg-neutral-800 text-white border border-neutral-700 shadow-md'
                        : 'text-neutral-400 hover:text-white hover:bg-neutral-900/60 border border-neutral-850'
                    }`}
                  >
                    <Camera className="w-4 h-4 text-[#E85E26]" />
                    <span>01 - Provas do Ensaio (Seleção)</span>
                    <span className="bg-neutral-900 text-[10px] px-2 py-0.5 rounded-full text-neutral-300 font-sans">
                      {proofs.length}
                    </span>
                  </button>

                  {/* 02 - Selecionadas */}
                  <button
                    type="button"
                    onClick={() => setProjectMainTab('selected')}
                    className={`px-4 py-2.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
                      projectMainTab === 'selected'
                        ? 'bg-emerald-600 text-black border border-emerald-500 shadow-md font-bold'
                        : 'text-neutral-400 hover:text-white hover:bg-neutral-900/60 border border-neutral-850'
                    }`}
                  >
                    <FolderCheck className="w-4 h-4 text-inherit" />
                    <span>02 - Minhas Selecionadas</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-sans font-bold ${
                      projectMainTab === 'selected' ? 'bg-black/30 text-white' : 'bg-neutral-900 text-neutral-300'
                    }`}>
                      {proofs.filter(p => p.isSelected).length}
                    </span>
                    {(activeProject.bonusPhotosCount || 0) > 0 && (
                      <span className="text-[9px] bg-black/40 text-amber-300 px-1.5 py-0.5 rounded-full font-bold">
                        🎁 +{activeProject.bonusPhotosCount} brinde
                      </span>
                    )}
                  </button>

                  {/* 03 - Entrega & IA (Com Destaque Laranja e Verde) */}
                  <button
                    type="button"
                    onClick={() => setProjectMainTab('delivered')}
                    className={`px-4 py-2.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer relative ${
                      projectMainTab === 'delivered'
                        ? 'bg-gradient-to-r from-[#E85E26] to-[#ea580c] text-white shadow-xl shadow-orange-950/50 border-2 border-orange-300/60 font-black'
                        : 'text-neutral-300 hover:text-white hover:bg-neutral-900/60 border border-orange-500/20'
                    }`}
                  >
                    <Sparkles className="w-4 h-4 text-white" />
                    <span>03 - Material Entregue</span>
                    <span className="bg-black/30 text-[10px] px-2 py-0.5 rounded-full font-sans font-bold">
                      {deliveredProofs.length}
                    </span>
                    {activeProject.status === 'partial_delivered' && (
                      <span className="bg-amber-400 text-black text-[9px] font-black px-1.5 py-0.5 rounded uppercase">
                        Parcial
                      </span>
                    )}
                    {activeProject.status === 'delivered' && (
                      <span className="bg-emerald-400 text-black text-[9px] font-black px-1.5 py-0.5 rounded uppercase">
                        Finalizada
                      </span>
                    )}
                  </button>

                  {/* 04 - Fotos Extras & Cashback 25% (Com Destaque Laranja e Verde) */}
                  <button
                    type="button"
                    onClick={() => setProjectMainTab('extras_cashback')}
                    className={`px-4 py-2.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
                      projectMainTab === 'extras_cashback'
                        ? 'bg-gradient-to-r from-[#E85E26] to-[#ea580c] text-white shadow-xl shadow-orange-950/50 border-2 border-orange-300/60 font-black'
                        : 'text-orange-400 hover:text-white hover:bg-neutral-900/60 border border-orange-500/30'
                    }`}
                  >
                    <Gift className="w-4 h-4 text-emerald-400" />
                    <span>04 - Fotos Extras & Cashback 25%</span>
                    <span className="bg-emerald-400 text-black text-[9px] font-black px-1.5 py-0.5 rounded uppercase shadow-sm">
                      25% OFF
                    </span>
                  </button>
                </div>

                {projectMainTab === 'extras_cashback' ? (
                  <ExtraPhotosAndCashbackCard 
                    project={activeProject}
                    onOpenZoom={(p) => setZoomedProof(p)}
                    isAdmin={effectiveIsAdmin && !isPreviewAsClient}
                    onOpenAdminManager={() => setIsReferralManagerOpen(true)}
                  />
                ) : projectMainTab === 'delivered' ? (
                  <DeliveredMaterialHub
                    project={activeProject}
                    deliveredProofs={deliveredProofs}
                    approvedProofs={proofs.filter(p => p.isSelected)}
                    token={token || getAccessToken()}
                    isAdmin={effectiveIsAdmin && !isPreviewAsClient}
                    onSyncDeliveredFolder={() => handleSyncDeliveredFolder(activeProject.id)}
                    onOpenZoom={(p) => setZoomedProof(p)}
                    onOpenAdminManager={() => setIsReferralManagerOpen(true)}
                  />
                ) : projectMainTab === 'selected' ? (
                  <SelectedProofsHub
                    project={activeProject}
                    selectedProofs={proofs.filter(p => p.isSelected)}
                    allProofsCount={proofs.length}
                    isAdmin={effectiveIsAdmin && !isPreviewAsClient}
                    onOpenZoom={(p) => setZoomedProof(p)}
                    onSyncSelectedFolder={() => handleSyncSelectedFolder(activeProject.id)}
                    isSyncingSelected={syncingSelected}
                    onGoToProofsTab={() => setProjectMainTab('proofs')}
                  />
                ) : (
                  <>
                  {/* Financial overview card for client */}
                  {(() => {
                    const contracted = activeProject.contractedCount || 10;
                    const bonus = activeProject.bonusPhotosCount || 0;
                    const freeThreshold = contracted + bonus;
                    const selectedCount = proofs.filter(p => p.isSelected).length;
                    const extraCount = Math.max(0, selectedCount - freeThreshold);
                    const extraPrice = activeProject.extraPhotoPrice !== undefined ? activeProject.extraPhotoPrice : 75;
                    const totalCalculated = (activeProject.priceEstimate || 0) + (extraCount * extraPrice);

                    return (
                      <div className="bg-[#141414] border border-neutral-900 rounded-3xl p-6 grid grid-cols-1 md:grid-cols-3 gap-6 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-[200px] h-[200px] bg-orange-500/5 rounded-full filter blur-3xl pointer-events-none" />
                        
                        <div className="flex flex-col justify-between">
                          <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider">Limites de Seleção Contratada</span>
                          <div className="mt-2.5 flex flex-wrap items-baseline gap-1.5">
                            <span className="text-2xl font-bold text-white font-sans">{contracted}</span>
                            <span className="text-xs text-neutral-400 font-mono">fotos incluídas</span>
                            {bonus > 0 && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold bg-[#E85E26]/20 text-[#ff7236] border border-[#E85E26]/40 px-2 py-0.5 rounded-full ml-1">
                                🎁 +{bonus} de cortesia
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-neutral-500 mt-2">
                            {bonus > 0 
                              ? `Você pode selecionar até ${freeThreshold} fotos sem custo adicional (${contracted} do pacote + ${bonus} de brinde).`
                              : `Você pode selecionar até ${contracted} fotos sem custo adicional do pacote.`}
                          </p>
                        </div>

                        <div className="flex flex-col justify-between border-t md:border-t-0 md:border-l border-neutral-850 pt-4 md:pt-0 md:pl-6">
                          <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider">Retoques Extras Selecionados</span>
                          <div className="mt-2.5 flex items-baseline gap-1.5">
                            <span className={`text-2xl font-bold font-sans ${extraCount > 0 ? 'text-[#E85E26]' : 'text-neutral-300'}`}>
                              {extraCount}
                            </span>
                            <span className="text-xs text-neutral-400 font-mono">fotos extras</span>
                          </div>
                          <p className="text-[10px] text-neutral-500 mt-2">
                            Cada foto acima de {freeThreshold} custa R$ {extraPrice} por retoque.
                          </p>
                        </div>

                        <div className="flex flex-col justify-between border-t md:border-t-0 md:border-l border-neutral-850 pt-4 md:pt-0 md:pl-6 bg-orange-500/[0.02] -m-6 p-6 rounded-r-3xl">
                          <span className="text-[10px] font-mono text-[#E85E26] font-bold uppercase tracking-wider">Orçamento Consolidado</span>
                          <div className="mt-2.5">
                            <span className="text-2xl font-mono font-bold text-[#E85E26]">
                              R$ {totalCalculated.toLocaleString('pt-BR')}
                            </span>
                            <span className="text-[10px] text-neutral-500 block mt-1 font-mono">
                              Base do Pacote: R$ {activeProject.priceEstimate?.toLocaleString('pt-BR')} ({contracted} fotos{bonus > 0 ? ` + ${bonus} brinde` : ''})
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                {/* Proof Selectors Workspace Catalog Area */}
                <div className="space-y-6">
                  {/* Gallery Header and Filter Bar */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-neutral-900 pb-4">
                    <div>
                      <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                        <span>Galeria de Provas do Ensaio</span>
                        {clientGalleryFilter === 'selected' && (
                          <span className="text-[10px] font-mono font-bold bg-[#E85E26]/20 text-[#ff7236] border border-[#E85E26]/40 px-2.5 py-0.5 rounded-full uppercase">
                            Minhas Escolhas ({proofs.filter(p => p.isSelected).length})
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        {clientGalleryFilter === 'selected'
                          ? `Exibindo apenas as ${proofs.filter(p => p.isSelected).length} foto(s) que você selecionou para retoque.`
                          : 'Selecione suas fotos favoritas e escreva em cada uma os retoques e melhorias estéticas que você prefere.'}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {/* Filter Pills */}
                      <button
                        type="button"
                        onClick={() => setClientGalleryFilter('all')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-mono font-semibold transition-all cursor-pointer border ${
                          clientGalleryFilter === 'all'
                            ? 'bg-neutral-800 text-white border-neutral-700 shadow-sm'
                            : 'bg-neutral-900/60 text-neutral-400 border-neutral-850 hover:text-white'
                        }`}
                      >
                        Todas ({proofs.length})
                      </button>

                      <button
                        type="button"
                        onClick={() => setClientGalleryFilter('selected')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-mono font-semibold transition-all cursor-pointer border flex items-center gap-1.5 ${
                          clientGalleryFilter === 'selected'
                            ? 'bg-[#E85E26] text-white border-[#E85E26] shadow-md shadow-orange-950/30'
                            : 'bg-neutral-900/60 text-neutral-400 border-neutral-850 hover:text-white'
                        }`}
                      >
                        <span>Selecionadas</span>
                        <span className="bg-black/30 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                          {proofs.filter(p => p.isSelected).length}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setClientGalleryFilter('notes')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-mono font-semibold transition-all cursor-pointer border ${
                          clientGalleryFilter === 'notes'
                            ? 'bg-amber-500 text-black border-amber-500 shadow-sm'
                            : 'bg-neutral-900/60 text-neutral-400 border-neutral-850 hover:text-white'
                        }`}
                      >
                        Com Notas ({proofs.filter(p => p.clientNotes && p.clientNotes.trim()).length})
                      </button>

                      <button
                        onClick={() => activeProject && handleSyncDriveFolder(activeProject.id)}
                        disabled={syncingFolder}
                        className="p-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-amber-500/40 text-neutral-400 hover:text-amber-500 rounded-xl transition-all cursor-pointer ml-1"
                        title="Atualizar galeria do Google Drive"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${syncingFolder ? 'animate-spin' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {/* Post-Finalization Confirmation & Action Card */}
                  {['approved', 'editing', 'delivered'].includes(activeProject.status) && (
                    <div className="bg-emerald-950/20 border border-emerald-900/50 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div className="flex items-center gap-3.5">
                        <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20 shrink-0">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white font-mono uppercase tracking-wider">
                            Lote Homologado • {activeProject.selectedCount} Foto(s) Selecionadas
                          </p>
                          <p className="text-[11px] text-neutral-400 mt-0.5">
                            Suas fotos e notas de edição estão registradas e em fluxo de pós-produção do fotógrafo Dilson Ferreira.
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2.5 self-stretch md:self-auto justify-end">
                        <button
                          type="button"
                          onClick={handleCopyLightroomFilenames}
                          className="px-3.5 py-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-200 text-xs font-mono rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5 text-amber-500" />
                          <span>Copiar Nomes dos Arquivos</span>
                        </button>

                        {activeProject.selectedDriveFolderId && (
                          <a
                            href={getDriveFolderUrl(activeProject.selectedDriveFolderId)}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3.5 py-2 bg-emerald-900/30 hover:bg-emerald-800/40 border border-emerald-700/50 text-emerald-300 text-xs font-mono rounded-xl flex items-center gap-1.5 transition-all"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Pasta 02 - SELECIONADAS</span>
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  {proofs.length <= 1 && (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-amber-400">
                            {proofs.length === 1 ? 'Apenas 1 foto carregada no momento' : 'Aguardando sincronização'}
                          </p>
                          <p className="text-[11px] text-neutral-300 mt-0.5">
                            Se a sua pasta contém 191 arquivos, clique em sincronizar para carregar todas as fotos do ensaio.
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => activeProject && handleSyncDriveFolder(activeProject.id)}
                        disabled={syncingFolder}
                        className="bg-amber-500 hover:bg-amber-400 text-black text-xs font-mono font-bold uppercase tracking-wider px-4 py-2 rounded-xl transition-all flex items-center gap-2 shrink-0 cursor-pointer shadow-md disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${syncingFolder ? 'animate-spin' : ''}`} />
                        {syncingFolder ? 'Sincronizando...' : 'Sincronizar Todas as 191 Fotos'}
                      </button>
                    </div>
                  )}

                  {proofs.length === 0 ? (
                    <div className="bg-neutral-900/40 border border-neutral-850/60 rounded-3xl py-16 text-center text-neutral-600 flex flex-col items-center justify-center gap-1.5">
                      <Loader2 className="w-8 h-8 opacity-40 animate-spin text-amber-500" />
                      <p className="text-xs font-semibold">Fotógrafo está sincronizando os retratos brutas...</p>
                      <p className="text-[10px] text-neutral-700">Por favor, atualize em alguns instantes para conferir as provas integradas.</p>
                    </div>
                  ) : (
                    (() => {
                      const displayed = proofs.filter((p) => {
                        if (clientGalleryFilter === 'selected') return p.isSelected;
                        if (clientGalleryFilter === 'notes') return Boolean(p.clientNotes && p.clientNotes.trim());
                        return true;
                      });

                      if (displayed.length === 0) {
                        return (
                          <div className="bg-[#121212]/70 border border-neutral-850 rounded-3xl py-16 px-4 text-center max-w-md mx-auto space-y-4 my-8">
                            <CheckSquare className="w-10 h-10 text-neutral-600 mx-auto" />
                            <div>
                              <p className="text-sm font-bold text-neutral-200">
                                {clientGalleryFilter === 'selected'
                                  ? 'Nenhuma foto selecionada ainda.'
                                  : 'Nenhuma foto com observações de retoque.'}
                              </p>
                              <p className="text-xs text-neutral-500 mt-1">
                                {clientGalleryFilter === 'selected'
                                  ? 'Alterne para "Todas as Fotos" e clique no canto de cada foto para selecioná-la.'
                                  : 'Clique em "Adicionar observações" nas fotos para escrever instruções de edição.'}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setClientGalleryFilter('all')}
                              className="text-xs font-mono text-[#E85E26] hover:text-[#ff7236] font-bold uppercase tracking-wider underline cursor-pointer"
                            >
                              Ver Todas as {proofs.length} Fotos do Ensaio
                            </button>
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-8">
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            {displayed.map((proof) => (
                              <ImageProofCard 
                                key={proof.id}
                                proof={proof}
                                onToggleSelect={handleToggleSelectProof}
                                onUpdateNotes={handleUpdateNotesProof}
                                onZoom={(p) => setZoomedProof(p)}
                                statusLock={(!effectiveIsAdmin || isPreviewAsClient) && ['approved', 'editing', 'partial_delivered', 'delivered'].includes(activeProject.status)}
                                isAdmin={effectiveIsAdmin && !isPreviewAsClient}
                                onToggleBonus={handleToggleBonusPhoto}
                              />
                            ))}
                          </div>

                          {['approved', 'editing', 'partial_delivered', 'delivered'].includes(activeProject.status) && (
                            <div className="pt-6 border-t border-neutral-900">
                              <ExtraPhotosAndCashbackCard 
                                project={activeProject}
                                onOpenZoom={(p) => setZoomedProof(p)}
                                isAdmin={effectiveIsAdmin && !isPreviewAsClient}
                                onOpenAdminManager={() => setIsReferralManagerOpen(true)}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })()
                  )}
                </div>
              </>
            )}
          </div>
        ) : (
              // CLIENT LOGGED IN WITH NO CONFIGURED WORKSPACE PHOTOSHOOTS
              <div className="bg-[#121212]/90 border border-neutral-850 rounded-3xl p-10 text-center max-w-xl mx-auto space-y-6 my-12">
                <Compass className="w-12 h-12 text-[#E85E26] mx-auto animate-pulse" />
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-white font-sans uppercase">Conta Google Autenticada</h3>
                  <p className="text-xs text-[#a3a3a3] leading-relaxed">
                    E-mail logado: <strong className="text-white font-mono">{user.email}</strong>
                  </p>
                  <p className="text-xs text-neutral-400 leading-relaxed max-w-md mx-auto">
                    Não há nenhum ensaio registrado como cliente para este e-mail no momento. Como você é o administrador do estúdio, alterne para o modo Fotógrafo para cadastrar, configurar e sincronizar novos ensaios com o Google Drive.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => handleToggleViewRole('admin')}
                    className="w-full sm:w-auto bg-[#E85E26] hover:bg-[#ff7236] text-white font-mono text-xs font-bold uppercase tracking-wider px-6 py-3.5 rounded-xl transition-all cursor-pointer shadow-lg shadow-orange-950/20"
                  >
                    Ir para Modo Fotógrafo (Admin)
                  </button>
                  {projects.length > 0 && (
                    <button
                      onClick={() => {
                        handleSelectActiveProject(projects[0].id);
                        setIsPreviewAsClient(true);
                      }}
                      className="w-full sm:w-auto bg-neutral-900 hover:bg-neutral-800 text-neutral-300 font-mono text-xs font-semibold px-5 py-3.5 rounded-xl border border-neutral-800 transition-all cursor-pointer"
                    >
                      Visualizar Primeiro Ensaio Cadastrado
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Persistent Floating Selection & Real-Time Extra Photos Bar */}
        {activeProject && proofs.length > 0 && projectMainTab === 'proofs' && (!effectiveIsAdmin || isPreviewAsClient || viewRole === 'client') && (
          <FloatingSelectionBar
            selectedCount={proofs.filter(p => p.isSelected).length}
            totalCount={proofs.length}
            contractedCount={activeProject.contractedCount || 10}
            bonusPhotosCount={activeProject.bonusPhotosCount || 0}
            basePrice={activeProject.priceEstimate || 0}
            extraPhotoPrice={activeProject.extraPhotoPrice !== undefined ? activeProject.extraPhotoPrice : 75}
            isLocked={['approved', 'editing', 'partial_delivered', 'delivered'].includes(activeProject.status)}
            activeFilter={clientGalleryFilter}
            onFilterChange={(f) => setClientGalleryFilter(f)}
            onOpenFinalizeModal={handleOpenFinalizeModal}
          />
        )}
      </main>

      {/* --- REUSABLE MODALS SECTION --- */}
      <AnimatePresence>
        {/* Client Finalize Batch & Automated Google Drive Copy Modal */}
        {isFinalizeModalOpen && activeProject && (
          <FinalizeBatchModal
            project={activeProject}
            proofs={proofs}
            accessToken={token || getAccessToken()}
            onClose={() => setIsFinalizeModalOpen(false)}
            onFinalize={handleExecuteFinalizeBatch}
            onViewSelectedAfterFinalize={() => setClientGalleryFilter('selected')}
          />
        )}

        {/* Create photoshoot project modal */}
        {isCreateOpen && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
          >
            <CreateProjectModal 
              onClose={() => setIsCreateOpen(false)}
              onCreate={handleCreateProject}
            />
          </motion.div>
        )}

        {/* Edit Project details & Google Drive folders modal */}
        {isEditProjectModalOpen && activeProject && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <EditProjectModal
              project={activeProject}
              onClose={() => setIsEditProjectModalOpen(false)}
              onSave={handleSaveProjectEdits}
            />
          </motion.div>
        )}

        {/* Dynamic Zoom Proof Workspace Detail expand viewport */}
        {zoomedProof && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }} 
            animate={{ opacity: 1, scale: 1 }} 
            exit={{ opacity: 0, scale: 0.98 }}
          >
            <ZoomProofModal 
              proof={zoomedProof}
              onClose={() => setZoomedProof(null)}
              onToggleSelect={handleToggleSelectProof}
              onUpdateNotes={handleUpdateNotesProof}
              onNext={() => handleScrollProof('next')}
              onPrev={() => handleScrollProof('prev')}
              statusLock={
                (effectiveIsAdmin && !isPreviewAsClient)
                  ? false
                  : (activeProject ? ['approved', 'editing', 'partial_delivered', 'delivered'].includes(activeProject.status) : false)
              }
              isAdmin={effectiveIsAdmin && !isPreviewAsClient}
              onToggleBonus={handleToggleBonusPhoto}
            />
          </motion.div>
        )}

        {/* Edit Google Drive Folder Modal */}
        {isEditingFolderModal && activeProject && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <div className="w-full max-w-lg bg-[#141414] border border-neutral-800 rounded-3xl p-6 shadow-2xl space-y-5">
              <div className="flex items-center justify-between border-b border-neutral-900 pb-4">
                <div className="flex items-center gap-2">
                  <FolderEdit className="w-5 h-5 text-[#E85E26]" />
                  <h3 className="text-base font-bold text-white">Configurar Pastas do Google Drive</h3>
                </div>
                <button 
                  onClick={() => setIsEditingFolderModal(false)}
                  className="text-neutral-500 hover:text-white p-1 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-neutral-400 leading-relaxed">
                Configure os links ou códigos das 3 pastas do Google Drive para o ensaio <strong>{activeProject?.projectName}</strong>.
              </p>

              <div className="space-y-4">
                {/* 1. Raw / Proofs */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono uppercase tracking-wider text-neutral-300 font-medium">
                    1. Pasta de Provas (Brutas para Seleção) *
                  </label>
                  <input 
                    type="text"
                    value={editFolderInput}
                    onChange={(e) => setEditFolderInput(e.target.value)}
                    placeholder="Link ou ID da pasta de provas..."
                    className="w-full bg-[#0c0c0c] text-xs text-white p-3 rounded-xl border border-neutral-800 focus:border-[#E85E26] focus:outline-none font-mono"
                  />
                  <p className="text-[10px] text-neutral-500 font-mono">
                    ID extraído: <code className="text-[#E85E26]">{extractDriveFolderId(editFolderInput)}</code>
                  </p>
                </div>

                {/* 2. Selected */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-medium">
                    2. Pasta de Fotos Selecionadas (Destino)
                  </label>
                  <input 
                    type="text"
                    value={editSelectedFolderInput}
                    onChange={(e) => setEditSelectedFolderInput(e.target.value)}
                    placeholder="Link ou ID da pasta para fotos selecionadas..."
                    className="w-full bg-[#0c0c0c] text-xs text-white p-3 rounded-xl border border-neutral-800 focus:border-emerald-500 focus:outline-none font-mono"
                  />
                  <p className="text-[10px] text-neutral-500">
                    Para onde as fotos aprovadas serão copiadas pelo botão "Direcionar Selecionadas".
                  </p>
                </div>

                {/* 3. Delivered */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono uppercase tracking-wider text-sky-400 font-medium">
                    3. Pasta de Entrega Finalizada
                  </label>
                  <input 
                    type="text"
                    value={editDeliveredFolderInput}
                    onChange={(e) => setEditDeliveredFolderInput(e.target.value)}
                    placeholder="Link ou ID da pasta de entrega final..."
                    className="w-full bg-[#0c0c0c] text-xs text-white p-3 rounded-xl border border-neutral-800 focus:border-sky-500 focus:outline-none font-mono"
                  />
                  <p className="text-[10px] text-neutral-500">
                    O cliente poderá acessar diretamente esta pasta para baixar os arquivos finais em alta resolução.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-900">
                <button
                  onClick={() => setIsEditingFolderModal(false)}
                  className="px-4 py-2.5 text-xs font-mono uppercase text-neutral-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveDriveFolders}
                  disabled={syncingFolder}
                  className="bg-[#E85E26] hover:bg-[#ff7236] text-white font-bold text-xs font-mono uppercase tracking-wider px-5 py-2.5 rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncingFolder ? 'animate-spin' : ''}`} />
                  Salvar Pastas e Sincronizar
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Clube VIP de Indicações & Cashback Manager Modal */}
        {isReferralManagerOpen && (
          <ReferralManagerModal
            projects={projects}
            initialSelectedProjectId={activeProject?.id}
            onClose={() => setIsReferralManagerOpen(false)}
            onRefreshProjects={() => {
              // Projects state is automatically kept in real-time sync with onSnapshot listener
            }}
          />
        )}
      </AnimatePresence>

      <footer className="bg-[#0a0a0a] border-t border-neutral-900/80 py-8 px-4 text-center text-neutral-600 font-mono text-[10px] uppercase tracking-widest">
        <p>© {new Date().getFullYear()} DILSON FERREIRA - TODOS OS DIREITOS RESERVADOS</p>
        <p className="mt-1.5 text-neutral-700">DESENVOLVIDO EM IA INTEGRADA AO GOOGLE WORKSPACE DRIVE</p>
      </footer>
    </div>
  );
}
