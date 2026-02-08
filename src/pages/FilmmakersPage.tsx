import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Plus, Search, Edit, Trash2, UserCheck, UserX } from "lucide-react";
import { filmmakersApi } from "../api/filmmakers";
import { Pagination } from "../components/ui/Pagination";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { toast } from "../components/ui/Toast";

const LIMIT = 10;

export function FilmmakersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["filmmakers", page, search],
    queryFn: () =>
      filmmakersApi.list({ page, limit: LIMIT, search: search || undefined }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => filmmakersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["filmmakers"] });
      setDeleteId(null);
      toast("Filmmaker deleted", "success");
    },
    onError: (err: Error) => toast(err.message ?? "Delete failed", "error"),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      filmmakersApi.update(id, { enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["filmmakers"] });
      toast("Filmmaker updated", "success");
    },
    onError: (err: Error) => toast(err.message ?? "Update failed", "error"),
  });

  const filmmakers = Array.isArray(data?.data) ? data.data : [];
  const totalPages = data?.totalPages ?? 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Filmmakers</h1>
          <p className="mt-1 text-sm text-neutral-400">Manage filmmaker profiles and visibility</p>
        </div>
        <Link
          to="/filmmakers/new"
          className="btn-primary inline-flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          Add Filmmaker
        </Link>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
        <input
          type="search"
          placeholder="Search filmmakers..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="input-field pl-10"
        />
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
          </div>
        ) : filmmakers.length === 0 ? (
          <div className="py-12 text-center text-neutral-500">No filmmakers found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b border-neutral-800 bg-neutral-800/50">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-white">Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-white">Followers</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-white">Movies</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-white">Visibility</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-white">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filmmakers.map((f) => (
                  <tr key={f.id} className="border-b border-neutral-800/80 transition-colors hover:bg-neutral-800/30">
                    <td className="px-4 py-3 font-medium text-white">{f.name}</td>
                    <td className="px-4 py-3 text-neutral-400">{f.followerCount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-neutral-400">{f.movieCount}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => toggleMutation.mutate({ id: f.id, enabled: !f.enabled })}
                        className="rounded p-2 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white"
                        title={f.enabled ? "Disable" : "Enable"}
                      >
                        {f.enabled ? <UserCheck className="h-4 w-4 text-emerald-500" /> : <UserX className="h-4 w-4 text-neutral-500" />}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Link to={`/filmmakers/${f.id}`} className="rounded p-2 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white">
                          <Edit className="h-4 w-4" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => setDeleteId(f.id)}
                          className="rounded p-2 text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
                        >
                          <Trash2 className="h-4 w-4" />
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
          <div className="flex justify-end border-t border-neutral-800 p-4">
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
        open={!!deleteId}
        title="Delete filmmaker"
        message="This action cannot be undone. Are you sure?"
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        onCancel={() => setDeleteId(null)}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
