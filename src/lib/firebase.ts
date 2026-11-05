/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, signOut, browserSessionPersistence, setPersistence } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firestore
// CRITICAL: The app will break without databaseId bound if it is specified in config.
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Validate Connection to Firestore on boot as required by system skill
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Please check your Firebase configuration: client is offline.");
    }
  }
}
testConnection();

// Initialize Authentication
export const auth = getAuth(app);

// Configure Google OAuth provider with full Google Drive & Profile scopes
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/drive');
googleProvider.addScope('https://www.googleapis.com/auth/drive.file');
googleProvider.addScope('https://www.googleapis.com/auth/drive.readonly');
googleProvider.addScope('https://www.googleapis.com/auth/userinfo.profile');
googleProvider.addScope('https://www.googleapis.com/auth/userinfo.email');

// Force popup to select account when logging in
googleProvider.setCustomParameters({
  prompt: 'select_account',
  access_type: 'offline'
});

// Cache the Google Drive access token in memory
let cachedAccessToken: string | null = null;
let isSigningIn = false;

// Initialize Auth Listener
export const initAuth = (
  onAuthSuccess?: (user: User, token: string | null) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      const token = getAccessToken();
      if (onAuthSuccess) {
        onAuthSuccess(user, token);
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Google Sign-In with Popup
export const googleSignIn = async (): Promise<{ user: User; accessToken: string | null } | null> => {
  try {
    isSigningIn = true;
    await setPersistence(auth, browserSessionPersistence);
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    
    const token = credential?.accessToken || null;
    cachedAccessToken = token;
    
    // Store in both localStorage and sessionStorage to retain across page reloads
    if (token) {
      localStorage.setItem('google_drive_access_token', token);
      localStorage.setItem('google_drive_token_timestamp', Date.now().toString());
      sessionStorage.setItem('google_drive_access_token', token);
    }
    
    return { user: result.user, accessToken: token };
  } catch (error: any) {
    if (error?.code === 'auth/popup-closed-by-user' || error?.code === 'auth/cancelled-popup-request') {
      console.info('Autenticação cancelada pelo usuário (janela fechada).');
      return null;
    }
    console.error('Google Auth Popup Error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

// Helper to reconnect Google Drive and obtain a fresh OAuth token
export const reconnectGoogleDrive = async (): Promise<string | null> => {
  const res = await googleSignIn();
  return res?.accessToken || null;
};

// Retrieve token (with fallback to localStorage/sessionStorage for persistent sync across reloads)
export const getAccessToken = (): string | null => {
  if (!cachedAccessToken) {
    cachedAccessToken = localStorage.getItem('google_drive_access_token') || sessionStorage.getItem('google_drive_access_token');
  }
  return cachedAccessToken;
};

// Check if stored Google token is likely still valid (under 55 min old)
export const isDriveTokenFresh = (): boolean => {
  const token = getAccessToken();
  if (!token) return false;
  const timestampStr = localStorage.getItem('google_drive_token_timestamp');
  if (!timestampStr) return true; // fallback
  const ageMs = Date.now() - parseInt(timestampStr, 10);
  return ageMs < 55 * 60 * 1000;
};

// Logout
export const logoutUser = async () => {
  await signOut(auth);
  cachedAccessToken = null;
  localStorage.removeItem('google_drive_access_token');
  localStorage.removeItem('google_drive_token_timestamp');
  sessionStorage.removeItem('google_drive_access_token');
};

// --- Standard Firestore Error Handling conforming to FirestoreErrorInfo ---
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Core Firestore Error captured: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
