import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { filmmakersApi } from "../api/filmmakers";
import { toast } from "../components/ui/Toast";
import type { Filmmaker } from "../types/models";
import { ArrowLeft } from "lucide-react";

const emptyFilmmaker: Partial<Filmmaker> = {
  name: "",
  bio: "",
  avatarUrl: "",
  followerCount: 0,
  movieCount: 0,
  enabled: true,
  movieIds: [],
};

export function FilmmakerFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isNew = id === "new" || !id;

  const [form, setForm] = useState<Partial<Filmmaker>>(emptyFilmmaker);

  const { data: filmmaker, isLoading } = useQuery({
    queryKey: ["filmmakers", id],
    queryFn: () => filmmakersApi.get(id!),
    enabled: !isNew,
  });

  useEffect(() => {
    if (filmmaker) setForm({ ...emptyFilmmaker, ...filmmaker });
  }, [filmmaker]);

  const createMutation = useMutation({
    mutationFn: (body: Partial<Filmmaker>) => filmmakersApi.create(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["filmmakers"] });
      toast("Filmmaker created", "success");
      navigate("/filmmakers");
    },
    onError: (err: Error) => toast(err.message ?? "Create failed", "error"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id: fid, body }: { id: string; body: Partial<Filmmaker> }) =>
      filmmakersApi.update(fid, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["filmmakers"] });
      toast("Filmmaker updated", "success");
      navigate("/filmmakers");
    },
    onError: (err: Error) => toast(err.message ?? "Update failed", "error"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isNew) createMutation.mutate(form);
    else if (id) updateMutation.mutate({ id, body: form });
  };

  const loading = isLoading || createMutation.isPending || updateMutation.isPending;

  if (!isNew && isLoading && !filmmaker) {
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Link
          to="/filmmakers"
          className="rounded-lg p-2 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            {isNew ? "Add Filmmaker" : "Edit Filmmaker"}
          </h1>
          <p className="mt-1 text-sm text-neutral-400">
            {isNew ? "Create a new filmmaker profile" : "Update filmmaker details"}
          </p>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="card space-y-6 p-6">
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-300">Name</label>
            <input
              type="text"
              required
              value={form.name ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="input-field"
              placeholder="Filmmaker name"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-300">Bio</label>
            <textarea
              rows={4}
              value={form.bio ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
              className="input-field resize-none"
              placeholder="Short bio"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-300">Avatar URL</label>
            <input
              type="url"
              value={form.avatarUrl ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, avatarUrl: e.target.value }))}
              className="input-field"
              placeholder="https://..."
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="enabled"
              checked={form.enabled ?? true}
              onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))}
              className="h-4 w-4 rounded border-neutral-600 bg-neutral-800 text-primary-500 focus:ring-primary-500"
            />
            <label htmlFor="enabled" className="text-sm text-neutral-300">Visible on platform</label>
          </div>
        </div>
        <div className="flex gap-3 border-t border-neutral-800 pt-6">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? "Saving…" : isNew ? "Create" : "Update"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/filmmakers")}
            className="btn-ghost"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
