import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "./AuthContext";
import {
  getNotifications,
  onForegroundMessage,
  refreshFCMToken,
  type AdminNotification,
} from "../api/notifications";

interface NotificationContextValue {
  unreadCount: number;
  pendingNotification: AdminNotification | null;
  refreshUnreadCount: () => Promise<void>;
  markReadLocally: (id: string, isCurrentlyUnread: boolean) => void;
  markAllReadLocally: () => void;
  deleteLocally: (wasUnread: boolean) => void;
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

  const refreshUnreadCount = useCallback(async () => {
    if (!user) return;
    const data = await getNotifications(1, 0);
    setUnreadCount(data.unreadCount);
  }, [user]);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      setPendingNotification(null);
      return;
    }
    void refreshUnreadCount();
  }, [user, refreshUnreadCount]);

  useEffect(() => {
    if (!user) return;

    let unsubscribe: (() => void) | undefined;
    void onForegroundMessage((payload) => {
      setPendingNotification(payloadToNotification(payload));
      setUnreadCount((count) => count + 1);
    }).then((unsub) => {
      unsubscribe = unsub;
    });

    const handleWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type !== "BACKGROUND_FCM") return;
      setPendingNotification(payloadToNotification(event.data.payload));
      setUnreadCount((count) => count + 1);
    };

    navigator.serviceWorker?.addEventListener("message", handleWorkerMessage);
    return () => {
      unsubscribe?.();
      navigator.serviceWorker?.removeEventListener("message", handleWorkerMessage);
    };
  }, [user]);

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
      markReadLocally: (_id, isCurrentlyUnread) => {
        if (isCurrentlyUnread) setUnreadCount((count) => Math.max(0, count - 1));
      },
      markAllReadLocally: () => setUnreadCount(0),
      deleteLocally: (wasUnread) => {
        if (wasUnread) setUnreadCount((count) => Math.max(0, count - 1));
      },
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
