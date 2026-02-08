import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2 } from "lucide-react";
import { contentApi } from "../../api/content";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { toast } from "../../components/ui/Toast";

export function GenresPage() {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const queryClient = useQueryClient();

  const { data: genresData, isLoading } = useQuery({
    queryKey: ["content", "genres"],
    queryFn: () => contentApi.genres.list(),
  });
  const genres = Array.isArray(genresData) ? genresData : [];

  const createMutation = useMutation({
    mutationFn: (name: string) => contentApi.genres.create({ name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content", "genres"] });
      setNewName("");
      toast("Genre created", "success");
    },
    onError: (err: Error) => toast(err.message ?? "Create failed", "error"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      contentApi.genres.update(id, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content", "genres"] });
      setEditingId(null);
      toast("Genre updated", "success");
    },
    onError: (err: Error) => toast(err.message ?? "Update failed", "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => contentApi.genres.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content", "genres"] });
      setDeleteId(null);
      toast("Genre deleted", "success");
    },
    onError: (err: Error) => toast(err.message ?? "Delete failed", "error"),
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Genres</h1>
          <p className="mt-1 text-sm text-neutral-400">Manage genres and assign to movies</p>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="New genre name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newName.trim()) createMutation.mutate(newName.trim());
            }}
            className="input-field min-w-[180px] flex-1"
          />
          <button
            type="button"
            onClick={() => newName.trim() && createMutation.mutate(newName.trim())}
            disabled={!newName.trim() || createMutation.isPending}
            className="btn-primary inline-flex items-center gap-2 disabled:opacity-50"
          >
            <Plus className="h-5 w-5" />
            Add
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
          </div>
        ) : genres.length === 0 ? (
          <div className="py-12 text-center text-neutral-500">No genres yet. Add one above.</div>
        ) : (
          <ul className="divide-y divide-neutral-800">
            {genres.map((g) => (
              <li
                key={g.id}
                className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-neutral-800/30"
              >
                {editingId === g.id ? (
                  <div className="flex flex-1 items-center gap-2">
                    <input
                      type="text"
                      defaultValue={g.name}
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        if (v && v !== g.name)
                          updateMutation.mutate({ id: g.id, name: v });
                        setEditingId(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const v = (e.target as HTMLInputElement).value.trim();
                          if (v && v !== g.name)
                            updateMutation.mutate({ id: g.id, name: v });
                          setEditingId(null);
                        }
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      autoFocus
                      className="input-field flex-1"
                    />
                  </div>
                ) : (
                  <>
                    <span className="font-medium text-white">{g.name}</span>
                    <span className="text-sm text-neutral-400">{g.movieCount ?? 0} movies</span>
                  </>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingId(g.id)}
                    className="rounded p-2 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteId(g.id)}
                    className="rounded p-2 text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteId}
        title="Delete genre"
        message="Are you sure? Movies may lose this genre."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        onCancel={() => setDeleteId(null)}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
