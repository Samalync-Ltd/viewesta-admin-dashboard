import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck, ChevronRight, RefreshCw, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  deleteNotification,
  formatNotificationTime,
  getNotifications,
  getUnreadNotifications,
  getRegisteredDevices,
  markAllRead,
  markNotificationRead,
  registerPushNotifications,
  type AdminNotification,
} from "../api/notifications";
import { toast } from "../components/ui/Toast";
import { resolveNotificationRoute } from "../lib/notificationRoute";
import { useNotification } from "../contexts/NotificationContext";

const PAGE_LIMIT = 20;

export function NotificationsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { pendingNotification, clearPendingNotification, refreshUnreadCount } =
    useNotification();
  const [pushStatus, setPushStatus] = useState<"idle" | "enabled" | "blocked" | "unsupported">(
    () => {
      if (!("Notification" in window) || !("serviceWorker" in navigator)) return "unsupported";
      if (Notification.permission === "granted") return "enabled";
      if (Notification.permission === "denied") return "blocked";
      return "idle";
    }
  );

  // The inbox defaults to Unread. Marking something read must drop it out of
  // this list, not just restyle it — so the unread view is sourced from
  // GET /notifications/unread, which only ever returns is_read = false rows.
  const [view, setView] = useState<"unread" | "all">("unread");

  const inboxQuery = useQuery({
    queryKey: ["notification-inbox", view],
    queryFn: () =>
      view === "unread" ? getUnreadNotifications() : getNotifications(PAGE_LIMIT, 0),
  });

  const devicesQuery = useQuery({
    queryKey: ["notification-devices"],
    queryFn: getRegisteredDevices,
  });

  // A push tells us something arrived; it does not tell us what the backend
  // stored. Re-read the inbox instead of splicing the FCM payload into the
  // list, so every visible row is a real persisted notification.
  useEffect(() => {
    if (!pendingNotification) return;
    void queryClient.invalidateQueries({ queryKey: ["notification-inbox"] });
    clearPendingNotification();
  }, [clearPendingNotification, pendingNotification, queryClient]);

  const enablePushMutation = useMutation({
    mutationFn: registerPushNotifications,
    onSuccess: (result) => {
      if (!result.supported) {
        setPushStatus("unsupported");
        toast("Push notifications are not supported in this browser", "error");
        return;
      }
      if (!result.granted) {
        setPushStatus("blocked");
        toast("Notification permission was not granted", "error");
        return;
      }
      setPushStatus("enabled");
      toast(
        result.token ? "This admin device is registered" : "Permission granted, but no FCM token was returned",
        result.token ? "success" : "info"
      );
      void devicesQuery.refetch();
    },
  });

  const markReadMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: (_result, id) => {
      // Drop it from the unread list immediately; in the All view keep the row
      // but flip its flag so the indicator updates.
      queryClient.setQueryData<{ notifications: AdminNotification[]; unreadCount: number }>(
        ["notification-inbox", view],
        (current) => {
          if (!current) return current;
          const stillUnread = Math.max(0, current.unreadCount - 1);
          return view === "unread"
            ? {
                notifications: current.notifications.filter((item) => item.id !== id),
                unreadCount: stillUnread,
              }
            : {
                notifications: current.notifications.map((item) =>
                  item.id === id ? { ...item, is_read: true } : item
                ),
                unreadCount: stillUnread,
              };
        }
      );

      void queryClient.invalidateQueries({ queryKey: ["notification-inbox"] });
      void refreshUnreadCount();
    },
  });

  const markAllMutation = useMutation({
    mutationFn: markAllRead,
    onSuccess: () => {
      // Unread view empties out entirely.
      queryClient.setQueryData<{ notifications: AdminNotification[]; unreadCount: number }>(
        ["notification-inbox", view],
        (current) =>
          current
            ? {
                notifications:
                  view === "unread"
                    ? []
                    : current.notifications.map((item) => ({ ...item, is_read: true })),
                unreadCount: 0,
              }
            : current
      );
      void queryClient.invalidateQueries({ queryKey: ["notification-inbox"] });
      void refreshUnreadCount();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteNotification,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notification-inbox"] });
      void refreshUnreadCount();
    },
  });

  // Opening a notification takes the admin to the movie or show it is about,
  // and marks it read.
  const openNotification = (item: AdminNotification, route: string) => {
    if (!item.is_read) markReadMutation.mutate(item.id);
    navigate(route);
  };

  const inbox = inboxQuery.data?.notifications ?? [];
  const unreadCount = inboxQuery.data?.unreadCount ?? 0;
  const devices = devicesQuery.data ?? [];
  const statusCopy = useMemo(() => {
    if (pushStatus === "enabled") return "Browser push is enabled for this admin dashboard.";
    if (pushStatus === "blocked") return "Browser notifications are blocked. Enable them in browser settings.";
    if (pushStatus === "unsupported") return "This browser does not support web push notifications.";
    return "Enable this browser to receive operational alerts from the backend.";
  }, [pushStatus]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Notifications
          </h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">
            Admin alerts, such as content waiting for review
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            void inboxQuery.refetch();
            void refreshUnreadCount();
          }}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
            <div>
              <h2 className="font-semibold text-slate-900 dark:text-slate-100">
                Admin inbox
              </h2>
              <p className="text-sm text-slate-500">{unreadCount} unread</p>
              <div className="mt-2 flex gap-1" role="tablist" aria-label="Inbox filter">
                {(["unread", "all"] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    role="tab"
                    aria-selected={view === v}
                    onClick={() => setView(v)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      view === v
                        ? "bg-primary-600 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
                    }`}
                  >
                    {v === "unread" ? "Unread" : "All"}
                  </button>
                ))}
              </div>
            </div>
            <button
              type="button"
              disabled={markAllMutation.isPending || unreadCount === 0}
              onClick={() => markAllMutation.mutate()}
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-primary-600 hover:bg-primary-50 disabled:opacity-50 dark:text-primary-400 dark:hover:bg-primary-500/10"
            >
              <CheckCheck className="h-4 w-4" />
              Mark all read
            </button>
          </div>
          {inboxQuery.isLoading ? (
            <div className="flex h-40 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
            </div>
          ) : inbox.length === 0 ? (
            <div className="py-12 text-center text-slate-500 dark:text-slate-400">
              {view === "unread"
                ? "No unread notifications"
                : "No notifications"}
            </div>
          ) : (
            <ul className="divide-y divide-slate-200 dark:divide-slate-700">
              {inbox.map((item) => (
                <li key={item.id} className="flex gap-3 px-4 py-4">
                  <span className={`mt-2 h-2.5 w-2.5 rounded-full ${item.is_read ? "bg-slate-300 dark:bg-slate-600" : "bg-primary-500"}`} />
                  {(() => {
                    const route = resolveNotificationRoute(item);
                    const content = (
                      <>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-slate-900 dark:text-slate-100">
                        {item.title || "New notification"}
                      </p>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                        {item.notification_type ?? "system"}
                      </span>
                    </div>
                    {item.body && (
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                        {item.body}
                      </p>
                    )}
                    <p className="mt-2 text-xs text-slate-500">
                      {formatNotificationTime(item.created_at ?? item.createdAt)}
                    </p>
                      </>
                    );
                    return route ? (
                      <button
                        type="button"
                        onClick={() => openNotification(item, route)}
                        className="flex min-w-0 flex-1 items-start gap-2 rounded-lg text-left hover:bg-slate-50 dark:hover:bg-slate-700/40"
                        aria-label={`Open ${item.title || "notification"}`}
                      >
                        <span className="min-w-0 flex-1">{content}</span>
                        <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                      </button>
                    ) : (
                      <div className="min-w-0 flex-1">{content}</div>
                    );
                  })()}
                  <div className="flex items-start gap-1">
                    {!item.is_read && (
                      <button
                        type="button"
                        onClick={() => markReadMutation.mutate(item.id)}
                        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-primary-600 dark:hover:bg-slate-700"
                        aria-label="Mark notification as read"
                      >
                        <CheckCheck className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => deleteMutation.mutate(item.id)}
                      className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                      aria-label="Delete notification"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside className="space-y-4">
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="mb-3 flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary-600" />
              <h2 className="font-semibold text-slate-900 dark:text-slate-100">
                This device
              </h2>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">{statusCopy}</p>
            <button
              type="button"
              disabled={pushStatus === "enabled" || enablePushMutation.isPending}
              onClick={() => enablePushMutation.mutate()}
              className="mt-4 w-full rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {pushStatus === "enabled" ? "Enabled" : enablePushMutation.isPending ? "Registering..." : "Enable push"}
            </button>
            <p className="mt-3 text-xs text-slate-500">
              Registered devices: {devices.length}
            </p>
          </section>

        </aside>
      </div>
    </div>
  );
}
