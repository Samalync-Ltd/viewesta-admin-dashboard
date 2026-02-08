import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Search, Ban, CheckCircle, Gift } from "lucide-react";
import { usersApi } from "../api/users";
import { Pagination } from "../components/ui/Pagination";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { toast } from "../components/ui/Toast";

const LIMIT = 10;

export function UsersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [blockId, setBlockId] = useState<string | null>(null);
  const [grantId, setGrantId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["users", page, search],
    queryFn: () =>
      usersApi.list({ page, limit: LIMIT, search: search || undefined }),
  });

  const blockMutation = useMutation({
    mutationFn: (id: string) => usersApi.block(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setBlockId(null);
      toast("User blocked", "success");
    },
    onError: (err: Error) => toast(err.message ?? "Block failed", "error"),
  });

  const unblockMutation = useMutation({
    mutationFn: (id: string) => usersApi.unblock(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setBlockId(null);
      toast("User unblocked", "success");
    },
    onError: (err: Error) => toast(err.message ?? "Unblock failed", "error"),
  });

  const grantMutation = useMutation({
    mutationFn: (id: string) => usersApi.grantAccess(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setGrantId(null);
      toast("Access granted", "success");
    },
    onError: (err: Error) => toast(err.message ?? "Grant failed", "error"),
  });

  const users = Array.isArray(data?.data) ? data.data : [];
  const totalPages = data?.totalPages ?? 0;
  const targetUser = users.find((u) => u.id === blockId || u.id === grantId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Users
        </h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">
          View and manage platform users
        </p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          placeholder="Search users..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-4 text-slate-900 placeholder-slate-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        {isLoading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
          </div>
        ) : users.length === 0 ? (
          <div className="py-12 text-center text-slate-500 dark:text-slate-400">
            No users found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-700/50">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Email / Phone
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Subscription
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Wallet
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr
                    key={u.id}
                    className="border-b border-slate-100 dark:border-slate-700"
                  >
                    <td className="px-4 py-3">
                      <Link
                        to={`/users/${u.id}`}
                        className="font-medium text-primary-400 transition-colors hover:text-primary-300 hover:underline"
                      >
                        {u.email || u.phone || u.id}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                      {u.subscriptionStatus ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                      ${u.walletBalance?.toFixed(2) ?? "0.00"}
                    </td>
                    <td className="px-4 py-3">
                      {u.blocked ? (
                        <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/30 dark:text-red-400">
                          Blocked
                        </span>
                      ) : (
                        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setBlockId(u.id)}
                          className="rounded p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
                          title={u.blocked ? "Unblock" : "Block"}
                        >
                          {u.blocked ? (
                            <CheckCircle className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <Ban className="h-4 w-4 text-red-600" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => setGrantId(u.id)}
                          className="rounded p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
                          title="Grant access"
                        >
                          <Gift className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {totalPages > 1 && (
          <div className="flex justify-end border-t border-slate-200 p-4 dark:border-slate-700">
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              disabled={isLoading}
            />
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!blockId}
        title={targetUser?.blocked ? "Unblock user" : "Block user"}
        message={
          targetUser?.blocked
            ? `Unblock ${targetUser.email || targetUser.phone || targetUser.id}?`
            : `Block ${targetUser?.email || targetUser?.phone || targetUser?.id}? They will lose access.`
        }
        confirmLabel={targetUser?.blocked ? "Unblock" : "Block"}
        variant={targetUser?.blocked ? "default" : "danger"}
        onConfirm={() => {
          if (!blockId) return;
          targetUser?.blocked
            ? unblockMutation.mutate(blockId)
            : blockMutation.mutate(blockId);
        }}
        onCancel={() => setBlockId(null)}
        loading={blockMutation.isPending || unblockMutation.isPending}
      />

      <ConfirmDialog
        open={!!grantId}
        title="Grant access"
        message={`Manually grant access to ${targetUser?.email || targetUser?.phone || targetUser?.id}?`}
        confirmLabel="Grant"
        onConfirm={() => grantId && grantMutation.mutate(grantId)}
        onCancel={() => setGrantId(null)}
        loading={grantMutation.isPending}
      />
    </div>
  );
}
