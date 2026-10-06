import { FirebaseApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaV3Provider, AppCheck } from 'firebase/app-check';

let appCheckInstance: AppCheck | null = null;

export function initAppCheck(app: FirebaseApp): AppCheck | null {
  if (typeof window === 'undefined') return null;
  if (appCheckInstance) return appCheckInstance;

  const isDev = process.env.NODE_ENV === 'development' ||
                process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true' ||
                window.location.hostname === 'localhost';

  if (isDev) {
    // @ts-expect-error Firebase App Check debug token
    self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  }

  const appCheckSiteKey = process.env.NEXT_PUBLIC_FIREBASE_APP_CHECK_KEY;
  if (appCheckSiteKey && !isDev) {
    try {
      appCheckInstance = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(appCheckSiteKey),
        isTokenAutoRefreshEnabled: true,
      });
    } catch (err) {
      console.warn('[S2P] App Check initialization skipped:', err);
    }
  }
  return appCheckInstance;
}
