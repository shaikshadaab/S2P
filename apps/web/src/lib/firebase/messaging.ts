import { FirebaseApp } from 'firebase/app';
import { getMessaging, getToken, Messaging } from 'firebase/messaging';

let messagingInstance: Messaging | null = null;

export function getClientMessaging(app: FirebaseApp): Messaging | null {
  if (typeof window === 'undefined') return null;
  if (!('Notification' in window)) return null;

  if (!messagingInstance) {
    try {
      messagingInstance = getMessaging(app);
    } catch {
      // Messaging not supported in current environment
    }
  }
  return messagingInstance;
}

export async function requestNotificationToken(app: FirebaseApp, vapidKey?: string): Promise<string | null> {
  const messaging = getClientMessaging(app);
  if (!messaging) return null;
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      return await getToken(messaging, { vapidKey });
    }
  } catch {
    // Permission denied or offline
  }
  return null;
}
