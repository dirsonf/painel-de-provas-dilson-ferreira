/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Proof, DeliveredProof } from '../types';

export const DEFAULT_FOLDER_ID = '1CJ1JbADGfckjfysH6DK75-8Gau-9YGF6';

// Common photo and camera RAW extensions
const PHOTO_EXTENSIONS = [
  '.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif',
  '.cr2', '.cr3', '.arw', '.nef', '.dng', '.raw',
  '.tif', '.tiff', '.raf', '.orf', '.rw2', '.pef', '.bmp'
];

/**
 * Extracts a clean Google Drive folder or file ID from diverse user inputs:
 * - Direct IDs (e.g., "1CJ1JbADGfckjfysH6DK75-8Gau-9YGF6")
 * - Full folder URLs (e.g., "https://drive.google.com/drive/folders/1CJ1JbADGfckjfysH6DK75-8Gau-9YGF6?usp=sharing")
 * - File URLs (e.g., "https://drive.google.com/file/d/1CJ1JbADGfckjfysH6DK75-8Gau-9YGF6/view")
 * - Open URLs with query param (e.g., "https://drive.google.com/open?id=1CJ1JbADGfckjfysH6DK75-8Gau-9YGF6")
 */
export function extractDriveFolderId(input?: string | null): string {
  if (!input) return DEFAULT_FOLDER_ID;
  const trimmed = input.trim();

  // Match /folders/ID
  const folderMatch = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch && folderMatch[1]) return folderMatch[1];

  // Match /d/ID
  const fileMatch = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch && fileMatch[1]) return fileMatch[1];

  // Match id=ID
  const idMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch && idMatch[1]) return idMatch[1];

  // Clean any trailing query parameters or slashes
  const clean = trimmed.split('?')[0].split('&')[0].replace(/\/+$/, '');
  return clean || DEFAULT_FOLDER_ID;
}

/**
 * Tests whether a Drive file record looks like a photograph or camera proof.
 */
function isImageOrPhoto(file: { name?: string; mimeType?: string }): boolean {
  if (!file) return false;
  const mime = (file.mimeType || '').toLowerCase();
  if (mime.startsWith('image/')) return true;

  const fileName = (file.name || '').toLowerCase();
  if (PHOTO_EXTENSIONS.some(ext => fileName.endsWith(ext))) return true;

  // Accept files in shoot folder that are not folders or system/document files
  if (
    mime !== 'application/vnd.google-apps.folder' &&
    !fileName.startsWith('.') &&
    !fileName.endsWith('.pdf') &&
    !fileName.endsWith('.zip') &&
    !fileName.endsWith('.txt') &&
    !fileName.endsWith('.docx') &&
    !fileName.endsWith('.xlsx')
  ) {
    return true;
  }

  return false;
}

/**
 * High-quality mock portraits designed in Dilson Ferreira's aesthetic style (portraiture, mood lighting)
 */
export const PORTFOLIO_FALLBACKS: Proof[] = [
  {
    id: 'mock_proof_1',
    name: 'RETRATO_EDITORIAL_01_Dilson.jpg',
    thumbnailUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=600',
    fullUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=1200',
    status: 'pending',
    isSelected: false,
    updatedAt: new Date().toISOString()
  },
  {
    id: 'mock_proof_2',
    name: 'RETRATO_CLASSIC_02_Dilson.jpg',
    thumbnailUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=600',
    fullUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=1200',
    status: 'pending',
    isSelected: false,
    updatedAt: new Date().toISOString()
  },
  {
    id: 'mock_proof_3',
    name: 'RETRATO_OUTDOOR_03_Dilson.jpg',
    thumbnailUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=600',
    fullUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=1200',
    status: 'pending',
    isSelected: false,
    updatedAt: new Date().toISOString()
  },
  {
    id: 'mock_proof_4',
    name: 'RETRATO_STUDIO_04_Dilson.jpg',
    thumbnailUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=600',
    fullUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=1200',
    status: 'pending',
    isSelected: false,
    updatedAt: new Date().toISOString()
  },
  {
    id: 'mock_proof_5',
    name: 'RETRATO_FASHION_05_Dilson.jpg',
    thumbnailUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=600',
    fullUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=1200',
    status: 'pending',
    isSelected: false,
    updatedAt: new Date().toISOString()
  },
  {
    id: 'mock_proof_6',
    name: 'RETRATO_CORPORATE_06_Dilson.jpg',
    thumbnailUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=600',
    fullUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=1200',
    status: 'pending',
    isSelected: false,
    updatedAt: new Date().toISOString()
  },
  {
    id: 'mock_proof_7',
    name: 'RETRATO_FINEART_07_Dilson.jpg',
    thumbnailUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=600',
    fullUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=1200',
    status: 'pending',
    isSelected: false,
    updatedAt: new Date().toISOString()
  },
  {
    id: 'mock_proof_8',
    name: 'RETRATO_MINIMAL_08_Dilson.jpg',
    thumbnailUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=600',
    fullUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=1200',
    status: 'pending',
    isSelected: false,
    updatedAt: new Date().toISOString()
  },
  {
    id: 'mock_proof_9',
    name: 'RETRATO_CREATIVE_09_Dilson.jpg',
    thumbnailUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=600',
    fullUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=1200',
    status: 'pending',
    isSelected: false,
    updatedAt: new Date().toISOString()
  },
  {
    id: 'mock_proof_10',
    name: 'RETRATO_MOODY_10_Dilson.jpg',
    thumbnailUrl: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&q=80&w=600',
    fullUrl: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&q=80&w=1200',
    status: 'pending',
    isSelected: false,
    updatedAt: new Date().toISOString()
  }
];

/**
 * Fetch files from a specific folder ID in Drive with full pagination and shared drive support.
 */
async function fetchItemsInFolder(
  folderId: string, 
  accessToken: string
): Promise<{ files: any[]; subfolders: any[] }> {
  const allFiles: any[] = [];
  const allSubfolders: any[] = [];
  let pageToken: string | null = null;

  do {
    const q = `'${folderId}' in parents and trashed = false`;
    const fields = 'nextPageToken,files(id,name,mimeType,webContentLink,thumbnailLink,iconLink,createdTime,shortcutDetails)';
    
    // Attempt with full all-drives support
    let url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}` +
      `&fields=${encodeURIComponent(fields)}` +
      `&pageSize=1000&supportsAllDrives=true&includeItemsFromAllDrives=true`;

    if (pageToken) {
      url += `&pageToken=${encodeURIComponent(pageToken)}`;
    }

    let response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    });

    // If 401 Unauthorized, token is expired
    if (response.status === 401) {
      const err = new Error('Token do Google Drive expirado. Reconecte sua conta do Google.');
      err.name = 'DriveAuthExpiredError';
      throw err;
    }

    // If 400 Bad Request, retry without includeItemsFromAllDrives (fallback for some personal drives)
    if (response.status === 400) {
      let fallbackUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}` +
        `&fields=${encodeURIComponent(fields)}` +
        `&pageSize=1000`;
      if (pageToken) {
        fallbackUrl += `&pageToken=${encodeURIComponent(pageToken)}`;
      }
      response = await fetch(fallbackUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      });
      if (response.status === 401) {
        const err = new Error('Token do Google Drive expirado. Reconecte sua conta do Google.');
        err.name = 'DriveAuthExpiredError';
        throw err;
      }
    }

    if (!response.ok) {
      const errText = await response.text();
      console.warn(`Drive API files query error for folder ${folderId} (Status ${response.status}):`, errText);
      if (response.status === 403) {
        const err = new Error('Permissão negada no Google Drive. Verifique se a pasta foi compartilhada com permissão de leitor/editor.');
        err.name = 'DriveForbiddenError';
        throw err;
      }
      if (response.status === 404) {
        const err = new Error('Pasta não encontrada no Google Drive. Verifique o link ou ID da pasta.');
        err.name = 'DriveNotFoundError';
        throw err;
      }
      break;
    }

    const data = await response.json();
    const items = data.files || [];

    for (const item of items) {
      // Handle shortcut files
      if (item.mimeType === 'application/vnd.google-apps.shortcut' && item.shortcutDetails) {
        const resolved = {
          ...item,
          id: item.shortcutDetails.targetId || item.id,
          mimeType: item.shortcutDetails.targetMimeType || item.mimeType
        };
        if (resolved.mimeType === 'application/vnd.google-apps.folder') {
          allSubfolders.push(resolved);
        } else {
          allFiles.push(resolved);
        }
      } else if (item.mimeType === 'application/vnd.google-apps.folder') {
        allSubfolders.push(item);
      } else {
        allFiles.push(item);
      }
    }

    pageToken = data.nextPageToken || null;
  } while (pageToken);

  return { files: allFiles, subfolders: allSubfolders };
}

/**
 * Lists all image/photo files in a specific Google Drive folder.
 * Supports:
 * - Direct folder ID or full Google Drive URL
 * - Automatic detection if the user passed a single file ID (redirects to parent folder)
 * - Automatic crawling of subfolders (e.g. photos placed inside "Fotos" or "Export" folder)
 * - Handling of RAW and uncompressed formats
 * - Full pagination for 100+ or 191+ files
 */
export async function listFolderImages(
  folderInput: string = DEFAULT_FOLDER_ID, 
  accessToken: string | null,
  allowFallback: boolean = false
): Promise<Proof[]> {
  if (!accessToken) {
    if (allowFallback) {
      console.warn('No Google auth access token available. Returning high-fidelity fallback proofs.');
      return PORTFOLIO_FALLBACKS;
    }
    const err = new Error('Token do Google Drive não encontrado. Por favor, conecte sua conta Google.');
    err.name = 'DriveAuthExpiredError';
    throw err;
  }

  let cleanFolderId = extractDriveFolderId(folderInput);

  try {
    // 1. Verify item type: Check if the provided ID is actually a file instead of a folder
    try {
      const itemCheckUrl = `https://www.googleapis.com/drive/v3/files/${cleanFolderId}?fields=id,name,mimeType,parents&supportsAllDrives=true`;
      const itemCheckRes = await fetch(itemCheckUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      });

      if (itemCheckRes.ok) {
        const itemMeta = await itemCheckRes.json();
        // If user gave a file ID instead of a folder ID, pivot to its parent folder!
        if (
          itemMeta.mimeType !== 'application/vnd.google-apps.folder' && 
          itemMeta.parents && 
          itemMeta.parents.length > 0
        ) {
          console.log(`Detected file ID (${itemMeta.name}). Switching target to parent folder: ${itemMeta.parents[0]}`);
          cleanFolderId = itemMeta.parents[0];
        }
      }
    } catch (checkErr) {
      console.warn('Failed item check pre-flight (proceeding with target ID directly):', checkErr);
    }

    // 2. Fetch all direct items in the folder
    const { files: rootFiles, subfolders } = await fetchItemsInFolder(cleanFolderId, accessToken);
    let gatheredFiles = [...rootFiles];

    // 3. If there are subfolders, fetch items from subfolders as well
    // (Photographers often have a subfolder like "Seleção", "JPG", "RAW", "Export", "01 - PROVAS", etc.)
    if (subfolders.length > 0) {
      console.log(`Found ${subfolders.length} subfolder(s) in Drive folder. Scanning subfolder contents...`);
      for (const sub of subfolders.slice(0, 15)) { // scan up to 15 subfolders
        try {
          const subResult = await fetchItemsInFolder(sub.id, accessToken);
          gatheredFiles = gatheredFiles.concat(subResult.files);
        } catch (subErr) {
          console.warn(`Error scanning subfolder ${sub.name}:`, subErr);
        }
      }
    }

    // 4. Filter only photographic media or proofs
    const photoFiles = gatheredFiles.filter(isImageOrPhoto);

    // If no media found matching standard photo filters, but files exist, keep all non-folders
    const finalFiles = photoFiles.length > 0 ? photoFiles : gatheredFiles;

    if (finalFiles.length === 0) {
      if (allowFallback) {
        console.log('No photos found in the Google Drive folder. Using realistic fallback proofs.');
        return PORTFOLIO_FALLBACKS;
      }
      return [];
    }

    // 5. Map to Proof objects
    return finalFiles.map((file: any, index: number) => {
      const { thumbnailUrl, fullUrl } = buildSafePhotoUrls(file.id, file.thumbnailLink);

      return {
        id: file.id || `drive_file_${index}`,
        driveFileId: file.id,
        name: file.name || `foto_prova_${index + 1}.jpg`,
        thumbnailUrl: thumbnailUrl,
        fullUrl: fullUrl,
        status: 'pending',
        isSelected: false,
        updatedAt: new Date().toISOString()
      };
    });
  } catch (error: any) {
    console.error('Error in listFolderImages from Google Drive API:', error);
    if (error?.name === 'DriveAuthExpiredError' || error?.name === 'DriveForbiddenError' || error?.name === 'DriveNotFoundError') {
      throw error;
    }
    if (allowFallback) {
      return PORTFOLIO_FALLBACKS;
    }
    throw error;
  }
}

/**
 * Safely builds high-resolution and thumbnail links for a Google Drive file.
 * Handles RAW, CR3, HEIC, JPG, PNG and avoids malformed parameters.
 */
export function buildSafePhotoUrls(fileId: string, rawThumbnailLink?: string): { thumbnailUrl: string; fullUrl: string } {
  const cleanId = extractDriveFolderId(fileId) || fileId;

  // 1. Thumbnail URL:
  // If Drive API gave a signed thumbnailLink with =s..., safely scale to =s800
  let thumbnailUrl = '';
  if (rawThumbnailLink && rawThumbnailLink.includes('=s')) {
    thumbnailUrl = rawThumbnailLink.replace(/=s\d+/, '=s800');
  } else if (rawThumbnailLink) {
    thumbnailUrl = rawThumbnailLink;
  } else {
    // Universal Google Drive thumbnail service (sharp 800px width)
    thumbnailUrl = `https://drive.google.com/thumbnail?id=${cleanId}&sz=w800`;
  }

  // 2. Full Resolution URL
  const fullUrl = `https://lh3.googleusercontent.com/d/${cleanId}`;

  return { thumbnailUrl, fullUrl };
}

/**
 * Sanitizes any existing photo or thumbnail URL that might have malformed
 * parameters (e.g. broken "=w600" appended to googleusercontent URLs).
 */
export function sanitizePhotoUrl(url?: string | null, driveFileId?: string | null): string {
  if (!url) {
    return driveFileId ? `https://drive.google.com/thumbnail?id=${driveFileId}&sz=w800` : '';
  }

  // Fix broken =w600 appended directly to file ID in /d/FILE_ID=w600
  if (url.includes('lh3.googleusercontent.com/d/') && url.includes('=w')) {
    const cleanId = driveFileId || url.match(/\/d\/([a-zA-Z0-9_-]+)/)?.[1];
    return cleanId ? `https://drive.google.com/thumbnail?id=${cleanId}&sz=w800` : url.replace(/=w\d+.*$/, '');
  }

  return url;
}

/**
 * Helper to generate a direct web link to open a Google Drive folder.
 */
export function getDriveFolderUrl(folderId?: string | null): string {
  if (!folderId) return '';
  const clean = extractDriveFolderId(folderId);
  return clean ? `https://drive.google.com/drive/folders/${clean}` : '';
}

/**
 * Copies selected proofs directly into a designated target Google Drive folder
 * (e.g., the selected photos folder) using the Google Drive REST API.
 */
export async function copySelectedProofsToDriveFolder(
  proofs: Proof[],
  targetFolderInput: string,
  accessToken: string,
  onProgress?: (completed: number, total: number, fileName: string) => void
): Promise<{ success: number; failed: number; errors: string[] }> {
  const cleanTargetFolderId = extractDriveFolderId(targetFolderInput);
  let success = 0;
  let failed = 0;
  const errors: string[] = [];

  const selectedWithDriveId = proofs.filter(p => p.isSelected && p.driveFileId);

  for (let i = 0; i < selectedWithDriveId.length; i++) {
    const proof = selectedWithDriveId[i];
    if (onProgress) {
      onProgress(i, selectedWithDriveId.length, proof.name);
    }

    try {
      const url = `https://www.googleapis.com/drive/v3/files/${proof.driveFileId}/copy?supportsAllDrives=true`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          name: proof.name,
          parents: [cleanTargetFolderId]
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`Drive API copy failed for ${proof.name}:`, errorText);
        failed++;
        errors.push(`${proof.name}: ${response.statusText}`);
      } else {
        success++;
      }
    } catch (err: any) {
      console.error(`Error copying ${proof.name}:`, err);
      failed++;
      errors.push(`${proof.name}: ${err?.message || 'Erro de conexão'}`);
    }
  }

  if (onProgress) {
    onProgress(selectedWithDriveId.length, selectedWithDriveId.length, 'Concluído');
  }

  return { success, failed, errors };
}

/**
 * High-resolution fallback edited photos in Dilson Ferreira's signature aesthetic style
 */
export const DELIVERED_FALLBACKS: DeliveredProof[] = [
  {
    id: 'mock_deliv_1',
    name: '01_FINAL_EDITADA_DilsonFerreira.jpg',
    thumbnailUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=600',
    fullUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=1600',
    batchType: 'final',
    creativeNotes: 'Retoque de pele de alta frequência, iluminação concha e sombras aveludadas.',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'mock_deliv_2',
    name: '02_FINAL_EDITADA_DilsonFerreira.jpg',
    thumbnailUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=600',
    fullUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=1600',
    batchType: 'final',
    creativeNotes: 'Color grading cinematográfico e luz de recorte suave nos ombros.',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'mock_deliv_3',
    name: '03_FINAL_EDITADA_DilsonFerreira.jpg',
    thumbnailUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=600',
    fullUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=1600',
    batchType: 'partial',
    creativeNotes: 'Iluminação Rembrandt com contraste editorial fino.',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'mock_deliv_4',
    name: '04_FINAL_EDITADA_DilsonFerreira.jpg',
    thumbnailUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=600',
    fullUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=1600',
    batchType: 'partial',
    creativeNotes: 'Expressão executiva com fundo escuro e calibração para LinkedIn/site.',
    updatedAt: new Date().toISOString()
  }
];

/**
 * Fetches edited final pictures from folder 03 - EDITADAS
 */
export async function listDeliveredImages(
  folderInput: string,
  accessToken: string | null,
  batchType: 'partial' | 'final' = 'final',
  allowFallback: boolean = true
): Promise<DeliveredProof[]> {
  try {
    const proofs = await listFolderImages(folderInput, accessToken, false);
    if (proofs.length === 0) {
      return allowFallback ? DELIVERED_FALLBACKS : [];
    }
    return proofs.map((p) => ({
      id: p.id,
      driveFileId: p.driveFileId || '',
      name: p.name,
      thumbnailUrl: p.thumbnailUrl,
      fullUrl: p.fullUrl,
      downloadUrl: p.fullUrl || '',
      batchType,
      creativeNotes: 'Calibrado e finalizado por Dilson Ferreira',
      notes: '',
      deliveredAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));
  } catch (err) {
    console.warn('Delivered folder query error, using high-res fallback proofs:', err);
    if (allowFallback) return DELIVERED_FALLBACKS;
    throw err;
  }
}

