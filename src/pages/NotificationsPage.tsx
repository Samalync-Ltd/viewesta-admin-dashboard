import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Bell, Send } from "lucide-react";
import { notificationsApi } from "../api/notifications";
import { toast } from "../components/ui/Toast";

export function NotificationsPage() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [target, setTarget] = useState<"all" | "subscribers" | "specific">("all");

  const sendMutation = useMutation({
    mutationFn: () =>
      notificationsApi.send({ title, body, target }),
    onSuccess: () => {
      setTitle("");
      setBody("");
      toast("Notification sent", "success");
    },
    onError: (err: Error) => toast(err.message ?? "Send failed", "error"),
  });

  const { data: list, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => notificationsApi.list({ page: 1, limit: 20 }),
  });

  const notifications = Array.isArray(list?.data) ? list.data : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Notifications
        </h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">
          Send push notifications to users
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="mb-4 flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary-600" />
          <h2 className="font-semibold text-slate-900 dark:text-slate-100">
            New notification
          </h2>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (title.trim() && body.trim()) sendMutation.mutate();
          }}
          className="space-y-4"
        >
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="New releases"
              required
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Body
            </label>
            <textarea
              rows={3}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Check out the latest movies..."
              required
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Target
            </label>
            <select
              value={target}
              onChange={(e) =>
                setTarget(e.target.value as "all" | "subscribers" | "specific")
              }
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
            >
              <option value="all">All users</option>
              <option value="subscribers">Subscribers only</option>
              <option value="specific">Specific users</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={!title.trim() || !body.trim() || sendMutation.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            {sendMutation.isPending ? "Sending…" : "Send"}
          </button>
        </form>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-700">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100">
            Recent notifications
          </h2>
        </div>
        {isLoading ? (
          <div className="flex h-32 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-8 text-center text-slate-500 dark:text-slate-400">
            No notifications sent yet
          </div>
        ) : (
          <ul className="divide-y divide-slate-200 dark:divide-slate-700">
            {notifications.map((n) => (
              <li key={n.id} className="px-4 py-3">
                <p className="font-medium text-slate-900 dark:text-slate-100">
                  {n.title}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {n.body}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
                  {n.target} · {n.scheduledAt ?? n.sentAt ?? "—"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
