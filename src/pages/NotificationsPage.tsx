import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck, RefreshCw, Send, Trash2 } from "lucide-react";
import {
  deleteNotification,
  formatNotificationTime,
  getNotifications,
  getUnreadNotifications,
  getRegisteredDevices,
  markAllRead,
  markNotificationRead,
  notificationsApi,
  registerPushNotifications,
  type AdminNotification,
} from "../api/notifications";
import { toast } from "../components/ui/Toast";
import { useNotification } from "../contexts/NotificationContext";

const PAGE_LIMIT = 20;

export function NotificationsPage() {
  const queryClient = useQueryClient();
  const {
    pendingNotification,
    clearPendingNotification,
    markReadLocally,
    markAllReadLocally,
    deleteLocally,
    refreshUnreadCount,
  } = useNotification();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [target, setTarget] = useState<"all" | "subscribers" | "specific">("all");
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

  useEffect(() => {
    if (!pendingNotification) return;
    queryClient.setQueryData<{ notifications: AdminNotification[]; unreadCount: number }>(
      ["notification-inbox", view],
      (current) => {
        const previous = current ?? { notifications: [], unreadCount: 0 };
        if (previous.notifications.some((item) => item.id === pendingNotification.id)) {
          return previous;
        }
        return {
          ...previous,
          notifications: [pendingNotification, ...previous.notifications],
          unreadCount: previous.unreadCount + 1,
        };
      }
    );
    clearPendingNotification();
  }, [clearPendingNotification, pendingNotification, queryClient, view]);

  const sendMutation = useMutation({
    mutationFn: () => notificationsApi.send({ title, body, target }),
    onSuccess: () => {
      setTitle("");
      setBody("");
      toast("Notification sent", "success");
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (err: Error) => toast(err.message ?? "Send failed", "error"),
  });

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
      const notification = inboxQuery.data?.notifications.find((item) => item.id === id);
      markReadLocally(id, !notification?.is_read);

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
      markAllReadLocally();
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
    onSuccess: (_result, id) => {
      const notification = inboxQuery.data?.notifications.find((item) => item.id === id);
      deleteLocally(!notification?.is_read);
      void queryClient.invalidateQueries({ queryKey: ["notification-inbox"] });
      void refreshUnreadCount();
    },
  });

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
            Send broadcasts and receive admin alerts on this device
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
              {view === "unread" ? "Nothing unread — you are all caught up" : "No received notifications yet"}
            </div>
          ) : (
            <ul className="divide-y divide-slate-200 dark:divide-slate-700">
              {inbox.map((item) => (
                <li key={item.id} className="flex gap-3 px-4 py-4">
                  <span className={`mt-2 h-2.5 w-2.5 rounded-full ${item.is_read ? "bg-slate-300 dark:bg-slate-600" : "bg-primary-500"}`} />
                  <div className="min-w-0 flex-1">
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
                  </div>
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

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="mb-4 flex items-center gap-2">
              <Send className="h-5 w-5 text-primary-600" />
              <h2 className="font-semibold text-slate-900 dark:text-slate-100">
                New broadcast
              </h2>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (title.trim() && body.trim()) sendMutation.mutate();
              }}
              className="space-y-4"
            >
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Title"
                required
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
              />
              <textarea
                rows={3}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Message"
                required
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
              />
              <select
                value={target}
                onChange={(e) => setTarget(e.target.value as "all" | "subscribers" | "specific")}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
              >
                <option value="all">All users</option>
                <option value="subscribers">Subscribers only</option>
                <option value="specific">Specific users</option>
              </select>
              <button
                type="submit"
                disabled={!title.trim() || !body.trim() || sendMutation.isPending}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 font-medium text-white hover:bg-primary-700 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                {sendMutation.isPending ? "Sending..." : "Send"}
              </button>
            </form>
          </section>
        </aside>
      </div>
    </div>
  );
}
