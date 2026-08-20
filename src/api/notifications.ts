import { api } from "./client";
import { useMock } from "../config/useMock";
import { mockDb, mockDelay } from "../data/mockDb";
import type { NotificationPayload } from "../types/models";
import { getToken, onMessage } from "firebase/messaging";
import { initializeMessaging } from "../firebase/config";

export interface ScheduledNotification {
  id: string;
  title: string;
  body: string;
  target: string;
  scheduledAt: string;
  sentAt?: string;
  status: string;
}

export interface AdminNotification {
  id: string;
  title: string;
  body?: string;
  notification_type?: string;
  is_read?: boolean;
  created_at?: string;
  createdAt?: string;
  data?: Record<string, unknown>;
  action_url?: string;
}

export interface NotificationListResponse {
  notifications: AdminNotification[];
  unreadCount: number;
}

const resolveData = <T>(response: { data?: { data?: T } | T }): T =>
  ((response.data as { data?: T })?.data ?? response.data ?? {}) as T;

function getDeviceName(): string {
  const ua = navigator.userAgent || "";
  if (ua.includes("Edg/") || ua.includes("Edge/")) return "Edge";
  if (ua.includes("Chrome")) return "Chrome";
  if (ua.includes("Firefox")) return "Firefox";
  if (ua.includes("Safari")) return "Safari";
  if (ua.includes("Opera")) return "Opera";
  return "Unknown Browser";
}

function getServiceWorkerUrl(): string {
  const config = new URLSearchParams({
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? "",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? "",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? "",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "",
    appId: import.meta.env.VITE_FIREBASE_APP_ID ?? "",
  });

  return `/firebase-messaging-sw.js?${config.toString()}`;
}

const FCM_TOKEN_KEY = "viewesta_admin_fcm_token";

export const notificationsApi = {
  send: (payload: NotificationPayload) =>
    useMock
      ? mockDelay(300).then(() => ({ id: `n${Date.now()}`, ...payload, status: "sent" }))
      : api.post("/notifications/send", payload).then((r) => r.data),
  list: (params?: { page?: number; limit?: number }) =>
    useMock
      ? mockDelay(200).then(() => mockDb.getNotifications())
      : api.get<{ data: ScheduledNotification[]; total: number }>("/notifications", { params }).then((r) => r.data),
};

export async function registerNotificationServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;

  try {
    return await navigator.serviceWorker.register(getServiceWorkerUrl());
  } catch (err) {
    console.warn("[Notifications] Service worker registration failed:", err);
    return null;
  }
}

export async function getNotifications(limit = 20, offset = 0): Promise<NotificationListResponse> {
  if (useMock) {
    const list = await mockDelay(200).then(() => mockDb.getNotifications());
    const notifications = list.data.map((item) => ({
      ...item,
      notification_type: "system_announcement",
      is_read: false,
      created_at: item.scheduledAt ?? item.sentAt,
    }));
    return { notifications, unreadCount: notifications.length };
  }

  const response = await api.get("/notifications", { params: { limit, offset } });
  const data = resolveData<Partial<NotificationListResponse>>(response);
  return {
    notifications: Array.isArray(data.notifications) ? data.notifications : [],
    unreadCount: typeof data.unreadCount === "number" ? data.unreadCount : 0,
  };
}

export async function markNotificationRead(id: string): Promise<void> {
  if (useMock) return;
  await api.put(`/notifications/${id}/read`);
}

export async function markAllRead(): Promise<void> {
  if (useMock) return;
  await api.put("/notifications/read-all");
}

export async function deleteNotification(id: string): Promise<void> {
  if (useMock) return;
  await api.delete(`/notifications/${id}`);
}

export async function registerDevice(token: string): Promise<void> {
  if (useMock) {
    localStorage.setItem(FCM_TOKEN_KEY, token);
    return;
  }

  await api.post("/notifications/devices/register", {
    token,
    deviceType: "web",
    deviceName: getDeviceName(),
  });
  localStorage.setItem(FCM_TOKEN_KEY, token);
}

export async function unregisterDevice(token: string | null): Promise<void> {
  if (!token) return;
  try {
    if (!useMock) {
      await api.post("/notifications/devices/unregister", { token });
    }
  } finally {
    localStorage.removeItem(FCM_TOKEN_KEY);
  }
}

export async function getRegisteredDevices(): Promise<unknown[]> {
  if (useMock) return [];
  const response = await api.get("/notifications/devices");
  const data = resolveData<unknown[] | { devices?: unknown[] }>(response);
  if (Array.isArray(data)) return data;
  return Array.isArray(data.devices) ? data.devices : [];
}

export async function registerPushNotifications(): Promise<{
  supported: boolean;
  granted?: boolean;
  token?: string | null;
  error?: unknown;
}> {
  if (!("Notification" in window) || !("serviceWorker" in navigator)) {
    return { supported: false };
  }

  if (Notification.permission === "denied") {
    return { supported: true, granted: false };
  }

  try {
    let permission: NotificationPermission = Notification.permission;
    if (permission !== "granted") {
      permission = await Notification.requestPermission();
    }

    if (permission !== "granted") return { supported: true, granted: false };

    const messaging = await initializeMessaging();
    if (!messaging) return { supported: false };

    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
    if (!vapidKey) return { supported: true, granted: true, token: null };

    await registerNotificationServiceWorker();
    const registration = await navigator.serviceWorker.ready;
    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: registration,
    });

    if (!token) return { supported: true, granted: true, token: null };

    const storedToken = localStorage.getItem(FCM_TOKEN_KEY);
    if (storedToken && storedToken !== token) {
      await unregisterDevice(storedToken);
    }
    await registerDevice(token);
    return { supported: true, granted: true, token };
  } catch (error) {
    console.warn("[Notifications] Push registration failed:", error);
    return { supported: true, granted: false, error };
  }
}

export async function unregisterPushNotifications(): Promise<void> {
  await unregisterDevice(localStorage.getItem(FCM_TOKEN_KEY));
}

export async function refreshFCMToken(): Promise<void> {
  // Only attempt refresh if this device was previously registered
  const storedToken = localStorage.getItem(FCM_TOKEN_KEY);
  if (!storedToken) return;

  try {
    const messaging = await initializeMessaging();
    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
    if (!messaging || !vapidKey || !("serviceWorker" in navigator)) return;

    await registerNotificationServiceWorker();
    const registration = await navigator.serviceWorker.ready;
    const currentToken = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: registration,
    });
    if (!currentToken) return;

    if (storedToken !== currentToken) {
      await unregisterDevice(storedToken);
      await registerDevice(currentToken);
    }
  } catch (err) {
    console.warn("[Notifications] Token refresh failed:", err);
  }
}


export async function onForegroundMessage(
  callback: (payload: { notification?: { title?: string; body?: string }; data?: Record<string, string> }) => void
): Promise<() => void> {
  const messaging = await initializeMessaging();
  if (!messaging) return () => {};
  return onMessage(messaging, callback);
}

export function formatNotificationTime(timestamp?: string): string {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";

  const diffMins = Math.floor((Date.now() - date.getTime()) / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
