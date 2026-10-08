if (typeof window !== 'undefined') {
  throw new Error('FATAL: firebase-admin can only be imported in server runtime environment, not in client browser bundle.');
}

import fs from 'fs';
import { initializeApp, getApps, getApp, App, cert } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getStorage, Storage } from 'firebase-admin/storage';
import { getAuth, Auth } from 'firebase-admin/auth';

if (!process.env.STORAGE_EMULATOR_HOST && process.env.FIREBASE_STORAGE_EMULATOR_HOST) {
  process.env.STORAGE_EMULATOR_HOST = process.env.FIREBASE_STORAGE_EMULATOR_HOST.startsWith('http')
    ? process.env.FIREBASE_STORAGE_EMULATOR_HOST
    : 'http://' + process.env.FIREBASE_STORAGE_EMULATOR_HOST;
}

function getAdminApp(): App {
  if (getApps().length > 0) {
    return getApp();
  }

  const projectId =
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    process.env.FIREBASE_PROJECT_ID ||
    process.env.GCLOUD_PROJECT;

  const effectiveProjectId = projectId || 'shakeel-online-services-951ec';
  const storageBucket =
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    process.env.FIREBASE_STORAGE_BUCKET ||
    effectiveProjectId + '.appspot.com';

  // 1. Check local protected file path (Local Windows Workstation)
  const localSecretPath =
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
    'C:\\SOSPrint-Secrets\\service-account.json';

  if (fs.existsSync(localSecretPath)) {
    try {
      const raw = fs.readFileSync(localSecretPath, 'utf8');
      const serviceAccount = JSON.parse(raw);
      return initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id || effectiveProjectId,
        storageBucket
      });
    } catch (e) {
      console.warn('[Firebase Admin] Failed reading local service account file:', e);
    }
  }

  // 2. Check JSON string in environment variable (Vercel deployment)
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
