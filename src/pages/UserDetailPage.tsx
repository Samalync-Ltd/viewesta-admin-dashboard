import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usersApi } from "../api/users";
import { monetizationApi } from "../api/monetization";
import { toast } from "../components/ui/Toast";
import { ArrowLeft, Mail, Phone, Wallet, CreditCard, Ban, CheckCircle, Gift } from "lucide-react";

export function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery({
    queryKey: ["users", id],
    queryFn: () => usersApi.get(id!),
    enabled: !!id,
  });

  const { data: subscriptionsData } = useQuery({
    queryKey: ["monetization", "subscriptions"],
    queryFn: () => monetizationApi.subscriptions.list({ page: 1, limit: 100 }),
    enabled: !!id,
  });
  const subscriptions = subscriptionsData?.data?.filter((s) => s.userId === id) ?? [];

  const blockMutation = useMutation({
    mutationFn: () => usersApi.block(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast("User blocked", "success");
    },
    onError: (err: Error) => toast(err.message ?? "Failed", "error"),
  });

  const unblockMutation = useMutation({
    mutationFn: () => usersApi.unblock(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast("User unblocked", "success");
    },
    onError: (err: Error) => toast(err.message ?? "Failed", "error"),
  });

  const grantMutation = useMutation({
    mutationFn: () => usersApi.grantAccess(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast("Access granted", "success");
    },
    onError: (err: Error) => toast(err.message ?? "Failed", "error"),
  });

  if (!id) return null;
  if (isLoading && !user) {
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }
  if (!user) {
    return (
      <div className="space-y-4">
        <Link to="/users" className="btn-ghost inline-flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to users
        </Link>
        <p className="text-neutral-400">User not found.</p>
      </div>
    );
  }

  const subs = Array.isArray(subscriptions) ? subscriptions : [];

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Link
          to="/users"
          className="rounded-lg p-2 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            {user.name || user.email || user.phone || user.id}
          </h1>
          <p className="mt-1 text-sm text-neutral-400">User details</p>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="card p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-neutral-500">
            Contact
          </h2>
          <div className="space-y-3">
            {user.email && (
              <p className="flex items-center gap-2 text-sm text-neutral-300">
                <Mail className="h-4 w-4 text-neutral-500" />
                {user.email}
              </p>
            )}
            {user.phone && (
              <p className="flex items-center gap-2 text-sm text-neutral-300">
                <Phone className="h-4 w-4 text-neutral-500" />
                {user.phone}
              </p>
            )}
          </div>
        </div>
        <div className="card p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-neutral-500">
            Status
          </h2>
          <div className="space-y-2">
            <p className="text-sm text-neutral-300">
              Subscription:{" "}
              <span className="font-medium text-white">{user.subscriptionStatus ?? "none"}</span>
            </p>
            <p className="flex items-center gap-2 text-sm text-neutral-300">
              <Wallet className="h-4 w-4 text-neutral-500" />
              Wallet: <span className="font-medium text-primary-400">${user.walletBalance?.toFixed(2) ?? "0.00"}</span>
            </p>
            {user.blocked ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-500/20 px-2.5 py-0.5 text-xs font-medium text-red-400">
                Blocked
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
                Active
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-neutral-500">
          Actions
        </h2>
        <div className="flex flex-wrap gap-3">
          {user.blocked ? (
            <button
              type="button"
              onClick={() => unblockMutation.mutate()}
              disabled={unblockMutation.isPending}
              className="btn-ghost inline-flex items-center gap-2 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300"
            >
              <CheckCircle className="h-4 w-4" />
              Unblock
            </button>
          ) : (
            <button
              type="button"
              onClick={() => blockMutation.mutate()}
              disabled={blockMutation.isPending}
              className="btn-ghost inline-flex items-center gap-2 text-red-400 hover:bg-red-500/10 hover:text-red-300"
            >
              <Ban className="h-4 w-4" />
              Block
            </button>
          )}
          <button
            type="button"
            onClick={() => grantMutation.mutate()}
            disabled={grantMutation.isPending}
            className="btn-ghost inline-flex items-center gap-2 text-primary-400 hover:bg-primary-500/10 hover:text-primary-300"
          >
            <Gift className="h-4 w-4" />
            Grant access
          </button>
        </div>
      </div>

      {subs.length > 0 ? (
        <div className="card overflow-hidden">
          <div className="border-b border-neutral-800 px-6 py-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-neutral-500">
              <CreditCard className="h-4 w-4" />
              Subscriptions
            </h2>
          </div>
          <ul className="divide-y divide-neutral-800">
            {subs.slice(0, 5).map((s: { id: string; planId: string; status: string; startDate: string }) => (
              <li key={s.id} className="flex items-center justify-between px-6 py-3 text-sm">
                <span className="text-neutral-400">Plan {s.planId}</span>
                <span className="text-neutral-300">{s.status} · {s.startDate}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
