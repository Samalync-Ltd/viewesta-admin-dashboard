import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "./AuthContext";
import {
  getUnreadNotifications,
  onForegroundMessage,
  refreshFCMToken,
  type AdminNotification,
} from "../api/notifications";
import { toast } from "../components/ui/Toast";
import { playNotificationChime } from "../lib/notificationChime";

/**
 * Realtime push (FCM) only works when the VITE_FIREBASE_* env vars and a VAPID
 * key are configured. When they are not — which is the case for any build
 * without a populated .env — `onForegroundMessage` resolves to a no-op and the
 * admin would only ever see a new notification by opening the panel.
 *
 * So the badge is also driven by a poll while the tab is visible. That path is
 * independent of Firebase and is what actually makes new notifications
 * noticeable: badge count, chime, toast, and a document-title marker.
 *
 * The count itself is ALWAYS whatever GET /notifications/unread reports. It is
 * never incremented, decremented or seeded locally, so the badge cannot drift
 * from the backend or display a number that no notification stands behind.
 */
const POLL_INTERVAL_MS = 30_000;
const BASE_TITLE = "Viewesta Admin";

interface NotificationContextValue {
  unreadCount: number;
  pendingNotification: AdminNotification | null;
  refreshUnreadCount: () => Promise<void>;
  clearPendingNotification: () => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

function payloadToNotification(payload: {
  notification?: { title?: string; body?: string };
  data?: Record<string, string>;
}): AdminNotification {
  return {
    id: payload.data?.notificationId ?? `fcm-${Date.now()}`,
    title: payload.notification?.title ?? payload.data?.title ?? "New notification",
    body: payload.notification?.body ?? payload.data?.body ?? "",
    notification_type: payload.data?.notification_type ?? payload.data?.type ?? "system_announcement",
    is_read: false,
    created_at: new Date().toISOString(),
    data: payload.data ?? {},
  };
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingNotification, setPendingNotification] = useState<AdminNotification | null>(null);
  // Last count we alerted on. `null` marks "not loaded yet" so the first
  // fetch after login seeds the baseline instead of chiming for a backlog.
  const lastCountRef = useRef<number | null>(null);

  /** Everything that makes a new notification impossible to miss. */
  const raiseAlert = useCallback((notif: AdminNotification) => {
    setPendingNotification(notif);
    toast(notif.title, "info");
    playNotificationChime();

    if ("Notification" in window && Notification.permission === "granted") {
      try {
        new Notification(notif.title, { body: notif.body, tag: notif.id });
      } catch (e) {
        console.warn("Could not show browser notification", e);
      }
    }
  }, []);

  const refreshUnreadCount = useCallback(async () => {
    if (!user) return;
    try {
      // GET /notifications/unread is the authoritative source: it returns the
      // real unread rows plus `count`, rather than a locally-tracked guess.
      const data = await getUnreadNotifications();
      const previous = lastCountRef.current;
      lastCountRef.current = data.unreadCount;
      setUnreadCount(data.unreadCount);

      // A rise since the last poll means something arrived while we were not
      // looking. Only ever alert with a real row from the server — if the
      // server sent a count but no row, there is nothing genuine to show, so
      // the badge updates silently rather than inventing a placeholder.
      if (previous !== null && data.unreadCount > previous) {
        const latest = data.notifications[0];
        if (latest) raiseAlert(latest);
      }
    } catch (err) {
      console.warn("[Notifications] Failed to refresh unread count", err);
    }
  }, [user, raiseAlert]);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      setPendingNotification(null);
      lastCountRef.current = null;
      return;
    }
    void refreshUnreadCount();
  }, [user, refreshUnreadCount]);

  useEffect(() => {
    if (!user) return;

    // A push payload is a transient alert signal only. It is NOT written into
    // the badge or the inbox list — both of those re-read the server, so what
    // the admin sees is always a persisted notification, never a client-built
    // object that may not match (or exist in) the backend.
    let unsubscribe: (() => void) | undefined;
    void onForegroundMessage((payload) => {
      raiseAlert(payloadToNotification(payload));
      void refreshUnreadCount();
    }).then((unsub) => {
      unsubscribe = unsub;
    });

    const handleWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type !== "BACKGROUND_FCM") return;
      raiseAlert(payloadToNotification(event.data.payload));
      void refreshUnreadCount();
    };

    navigator.serviceWorker?.addEventListener("message", handleWorkerMessage);
    return () => {
      unsubscribe?.();
      navigator.serviceWorker?.removeEventListener("message", handleWorkerMessage);
    };
  }, [user, raiseAlert, refreshUnreadCount]);

  // Poll while the tab is visible. Pausing when hidden keeps a backgrounded
  // dashboard from hammering the API; the visibilitychange handler below
  // refreshes immediately on return.
  useEffect(() => {
    if (!user) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void refreshUnreadCount();
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [user, refreshUnreadCount]);

  // Mirror the count into the tab title so it is visible from another tab.
  useEffect(() => {
    document.title = unreadCount > 0 ? `(${unreadCount}) ${BASE_TITLE}` : BASE_TITLE;
    return () => {
      document.title = BASE_TITLE;
    };
  }, [unreadCount]);

  useEffect(() => {
    if (!user) return;
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        void refreshUnreadCount();
        void refreshFCMToken();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [user, refreshUnreadCount]);

  const value = useMemo<NotificationContextValue>(
    () => ({
      unreadCount,
      pendingNotification,
      refreshUnreadCount,
      clearPendingNotification: () => setPendingNotification(null),
    }),
    [pendingNotification, refreshUnreadCount, unreadCount]
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotification() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotification must be used within NotificationProvider");
  return ctx;
}
