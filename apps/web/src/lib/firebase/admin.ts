if (typeof window !== 'undefined') {
  throw new Error('FATAL: firebase-admin can only be imported in server runtime environment, not in client browser bundle.');
}

import fs from 'fs';
import path from 'path';
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
      if (typeof serviceAccount.private_key === 'string' && serviceAccount.private_key.includes('\\n')) {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
      }
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
      let raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY.trim();
      if (!raw.startsWith('{')) {
        try {
          const b64 = Buffer.from(raw, 'base64').toString('utf8');
          if (b64.startsWith('{')) raw = b64;
        } catch {}
      }
      const serviceAccount = JSON.parse(raw);
      if (typeof serviceAccount.private_key === 'string' && serviceAccount.private_key.includes('\\n')) {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
      }
      return initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id || effectiveProjectId,
        storageBucket
      });
    } catch (e) {
      console.error('[Firebase Admin] Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:', e);
      throw e;
    }
  }

  // 3. Check separate client email and private key env vars
  if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    try {
      return initializeApp({
        credential: cert({
          projectId: effectiveProjectId,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        }),
        projectId: effectiveProjectId,
        storageBucket
      });
    } catch (e) {
      console.error('[Firebase Admin] Failed to init with clientEmail/privateKey:', e);
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


const localStorageDir = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.VERCEL_ENV ? path.resolve('/tmp', '.storage') : path.resolve(process.cwd(), '.storage');

class LocalStorageFile {
  private localPath: string;
  private metaPath: string;

  constructor(public name: string) {
    this.localPath = path.join(localStorageDir, name);
    this.metaPath = this.localPath + '.meta.json';
  }

  async save(buffer: Buffer | Uint8Array, options?: any): Promise<void> {
    const dir = path.dirname(this.localPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.localPath, Buffer.from(buffer));
    const metadata = {
      size: buffer.length,
      contentType: options?.contentType || 'application/octet-stream',
      metadata: options?.metadata || {},
      updated: new Date().toISOString()
    };
    fs.writeFileSync(this.metaPath, JSON.stringify(metadata, null, 2), 'utf8');
  }

  async exists(): Promise<[boolean]> {
    return [fs.existsSync(this.localPath)];
  }

  async delete(): Promise<void> {
    if (fs.existsSync(this.localPath)) fs.unlinkSync(this.localPath);
    if (fs.existsSync(this.metaPath)) fs.unlinkSync(this.metaPath);
  }

  async download(): Promise<[Buffer]> {
    if (!fs.existsSync(this.localPath)) {
      throw new Error('FILE_NOT_FOUND: ' + this.name);
    }
    return [fs.readFileSync(this.localPath)];
  }

  async getMetadata(): Promise<[any]> {
    if (!fs.existsSync(this.localPath)) {
      throw new Error('FILE_NOT_FOUND: ' + this.name);
    }
    if (fs.existsSync(this.metaPath)) {
      const meta = JSON.parse(fs.readFileSync(this.metaPath, 'utf8'));
      return [meta];
    }
    const stat = fs.statSync(this.localPath);
    return [{ size: stat.size, updated: stat.mtime.toISOString() }];
  }

  async getSignedUrl(): Promise<[string]> {
    // Return relative internal streaming URL for local storage
    return ['/api/upload/file/' + encodeURIComponent(path.basename(this.name))];
  }
}

class SmartStorageBucket {
  constructor(private cloudBucket: any) {}

  file(filePath: string) {
    const cloudFile = this.cloudBucket.file(filePath);
    const localFile = new LocalStorageFile(filePath);

    return {
      name: filePath,
      save: async (buffer: Buffer | Uint8Array, options?: any) => {
        const isProd = process.env.NODE_ENV === 'production' && !process.env.S2P_LOCAL_DEV;
        try {
          await cloudFile.save(buffer, options);
        } catch (err: any) {
          if (!isProd && (err?.message?.includes('bucket does not exist') || err?.code === 404 || err?.message?.includes('billing'))) {
            console.warn('[Storage] Remote bucket unprovisioned; saving to local workspace storage fallback in dev:', filePath);
            await localFile.save(buffer, options);
            return;
          }
          console.error('[Storage Error] Cloud file save failed:', err?.message);
          throw new Error('STORAGE_UNAVAILABLE: Private Firebase Storage bucket is not accessible or unprovisioned in production. Upload failed safely.');
        }
      },
      exists: async (): Promise<[boolean]> => {
        const isProd = process.env.NODE_ENV === 'production' && !process.env.S2P_LOCAL_DEV;
        if (isProd) {
          // Production: Strict cloud storage only, zero local fallback
          return await cloudFile.exists();
        }
        try {
          const [exists] = await cloudFile.exists();
          if (exists) return [true];
        } catch (err: any) {
          // Local development only fallback
        }
        return localFile.exists();
      },
      download: async (): Promise<[Buffer]> => {
        const isProd = process.env.NODE_ENV === 'production' && !process.env.S2P_LOCAL_DEV;
        if (isProd) {
          // Production: Strict cloud download only, zero local fallback
          return await cloudFile.download();
        }
        try {
          return await cloudFile.download();
        } catch (err: any) {
          const [locExists] = await localFile.exists();
          if (locExists) return localFile.download();
          throw err;
        }
      },
      getMetadata: async (): Promise<[any]> => {
        const isProd = process.env.NODE_ENV === 'production' && !process.env.S2P_LOCAL_DEV;
        if (isProd) {
          // Production: Strict cloud metadata only, zero local fallback
          return await cloudFile.getMetadata();
        }
        try {
          return await cloudFile.getMetadata();
        } catch (err: any) {
          return localFile.getMetadata();
        }
      },
      getSignedUrl: async (options?: any): Promise<[string]> => {
        const isProd = process.env.NODE_ENV === 'production' && !process.env.S2P_LOCAL_DEV;
        if (isProd) {
          // Production: Strict cloud signed URL only, zero local fallback
          return await cloudFile.getSignedUrl(options);
        }
        try {
          return await cloudFile.getSignedUrl(options);
        } catch (err: any) {
          return localFile.getSignedUrl();
        }
      },
      delete: async (): Promise<void> => {
        const isProd = process.env.NODE_ENV === 'production' && !process.env.S2P_LOCAL_DEV;
        if (isProd) {
          // Production: Do not suppress cloud deletion errors; record actual deletion outcome
          try {
            await cloudFile.delete();
            console.log('[Storage Audit] Cloud file deleted successfully:', filePath);
          } catch (cloudErr: any) {
            console.error('[Storage Error] Cloud file delete failed:', cloudErr?.message);
            throw new Error(`STORAGE_DELETE_FAILED: Cloud file deletion failed for ${filePath}: ${cloudErr?.message}`);
          }
          return;
        }
        try {
          await cloudFile.delete();
        } catch (err: any) {
          // Dev only fallback
        }
        await localFile.delete();
      }
    };
  }
}

export function getFileStorageBucket() {
  const bucketName =
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    process.env.FIREBASE_STORAGE_BUCKET ||
    adminApp.options.projectId + '.appspot.com';
  const rawBucket = adminStorage.bucket(bucketName);
  return new SmartStorageBucket(rawBucket);
}

