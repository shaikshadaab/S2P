import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, Auth } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, Firestore } from 'firebase/firestore';
import { getStorage, connectStorageEmulator, FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'demo-s2p-api-key',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 's2p-shakeel.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 's2p-shakeel',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 's2p-shakeel.appspot.com',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '1234567890',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:1234567890:web:abcdef123456',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);
const storage: FirebaseStorage = getStorage(app);

if (
  typeof window !== 'undefined' &&
  (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true' ||
   window.location.hostname === 'localhost' ||
   window.location.hostname === '127.0.0.1')
) {
  const isEmulated = (auth as unknown as { _isEmulated?: boolean })._isEmulated;
  if (!isEmulated) {
    try {
      connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
      connectFirestoreEmulator(db, 'localhost', 8080);
      connectStorageEmulator(storage, 'localhost', 9199);
      (auth as unknown as { _isEmulated?: boolean })._isEmulated = true;
      console.log('[S2P] Connected to Firebase Emulator Suite (Auth: 9099, Firestore: 8080, Storage: 9199)');
    } catch {
      // Ignore in fast refresh
    }
  }
}

export { app, auth, db, storage };
