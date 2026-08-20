import { initializeApp, getApp, getApps } from "firebase/app";
import { getMessaging, isSupported, type Messaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

let messagingInstance: Messaging | null = null;
let messagingPromise: Promise<Messaging | null> | null = null;

export async function initializeMessaging(): Promise<Messaging | null> {
  if (messagingInstance) return messagingInstance;
  if (messagingPromise) return messagingPromise;

  messagingPromise = (async () => {
    try {
      if (!(await isSupported())) return null;
      messagingInstance = getMessaging(app);
      return messagingInstance;
    } catch (err) {
      console.warn("[Firebase] Messaging unavailable:", err);
      return null;
    } finally {
      messagingPromise = null;
    }
  })();

  return messagingPromise;
}
