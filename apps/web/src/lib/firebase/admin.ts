if (typeof window !== 'undefined') {
  throw new Error('FATAL: firebase-admin can only be imported in server runtime environment, not in client browser bundle.');
}

import { initializeApp, getApps, getApp, App, cert } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getStorage, Storage } from 'firebase-admin/storage';

if (!process.env.STORAGE_EMULATOR_HOST && process.env.FIREBASE_STORAGE_EMULATOR_HOST) {
  process.env.STORAGE_EMULATOR_HOST = process.env.FIREBASE_STORAGE_EMULATOR_HOST.startsWith('http')
    ? process.env.FIREBASE_STORAGE_EMULATOR_HOST
    : 'http://' + process.env.FIREBASE_STORAGE_EMULATOR_HOST;
}
import { getAuth, Auth } from 'firebase-admin/auth';

function getAdminApp(): App {
  if (getApps().length > 0) {
    return getApp();
  }

  const projectId =
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    process.env.FIREBASE_PROJECT_ID ||
    process.env.GCLOUD_PROJECT;

  // If no project ID is configured during build/test phase, initialize with build placeholder
  // Real requests in production will validate projectId inside request handlers
  const effectiveProjectId = projectId || 's2p-build-unconfigured';
  const storageBucket =
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    process.env.FIREBASE_STORAGE_BUCKET ||
    effectiveProjectId + '.appspot.com';

  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    try {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      return initializeApp({
        credential: cert(serviceAccount),
        projectId: effectiveProjectId,
        storageBucket
      });
    } catch (e) {
      console.error('[Firebase Admin] Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:', e);
      throw e;
    }
  }

  return initializeApp({
    projectId: effectiveProjectId,
    storageBucket
  });
}

const adminApp = getAdminApp();
export const adminDb: Firestore = getFirestore(adminApp);
try {
  adminDb.settings({ ignoreUndefinedProperties: true });
} catch {
  // Ignore in case already initialized
}
export const adminStorage: Storage = getStorage(adminApp);
export const adminAuth: Auth = getAuth(adminApp);

export function getFileStorageBucket() {
  const bucketName =
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    process.env.FIREBASE_STORAGE_BUCKET ||
    adminApp.options.projectId + '.appspot.com';
  return adminStorage.bucket(bucketName);
}
