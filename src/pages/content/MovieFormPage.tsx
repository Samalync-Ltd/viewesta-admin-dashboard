import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { contentApi } from "../../api/content";
import { toast } from "../../components/ui/Toast";
import type { Movie, ContentStatus } from "../../types/models";

const emptyMovie: Partial<Movie> = {
  title: "",
  description: "",
  releaseYear: new Date().getFullYear(),
  duration: 0,
  genres: [],
  language: "en",
  ratingVisible: true,
  posterUrl: "",
  backdropUrl: "",
  trailerUrl: "",
  streamingUrl: "",
  tvodPrice: undefined,
  includedInSubscription: false,
  status: "draft",
  filmmakerIds: [],
};

export function MovieFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isNew = id === "new" || !id;

  const [form, setForm] = useState<Partial<Movie>>(emptyMovie);

  const { data: movie, isLoading } = useQuery({
    queryKey: ["content", "movies", id],
    queryFn: () => contentApi.movies.get(id!),
    enabled: !isNew,
  });

  useEffect(() => {
    if (movie) setForm({ ...emptyMovie, ...movie });
  }, [movie]);

  const createMutation = useMutation({
    mutationFn: (body: Partial<Movie>) => contentApi.movies.create(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content", "movies"] });
      toast("Movie created", "success");
      navigate("/content/movies");
    },
    onError: (err: Error) => toast(err.message ?? "Create failed", "error"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id: movieId, body }: { id: string; body: Partial<Movie> }) =>
      contentApi.movies.update(movieId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content", "movies"] });
      toast("Movie updated", "success");
      navigate("/content/movies");
    },
    onError: (err: Error) => toast(err.message ?? "Update failed", "error"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isNew) createMutation.mutate(form);
    else if (id) updateMutation.mutate({ id, body: form });
  };

  const loading = isLoading || createMutation.isPending || updateMutation.isPending;

  if (!isNew && isLoading && !movie) {
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          {isNew ? "Add Movie" : "Edit Movie"}
        </h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">
          {isNew ? "Create a new movie or show" : "Update movie details"}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Title
            </label>
            <input
              type="text"
              required
              value={form.title ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Description
            </label>
            <textarea
              rows={4}
              value={form.description ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Release Year
            </label>
            <input
              type="number"
              min={1900}
              max={2100}
              value={form.releaseYear ?? ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, releaseYear: Number(e.target.value) || undefined }))
              }
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Duration (minutes)
            </label>
            <input
              type="number"
              min={0}
              value={form.duration ?? ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, duration: Number(e.target.value) || 0 }))
              }
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Language
            </label>
            <input
              type="text"
              value={form.language ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, language: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Status
            </label>
            <select
              value={form.status ?? "draft"}
              onChange={(e) =>
                setForm((f) => ({ ...f, status: e.target.value as ContentStatus }))
              }
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="ratingVisible"
              checked={form.ratingVisible ?? true}
              onChange={(e) => setForm((f) => ({ ...f, ratingVisible: e.target.checked }))}
              className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
            />
            <label htmlFor="ratingVisible" className="text-sm text-slate-700 dark:text-slate-300">
              Rating visible
            </label>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="includedInSubscription"
              checked={form.includedInSubscription ?? false}
              onChange={(e) =>
                setForm((f) => ({ ...f, includedInSubscription: e.target.checked }))
              }
              className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
            />
            <label
              htmlFor="includedInSubscription"
              className="text-sm text-slate-700 dark:text-slate-300"
            >
              Included in subscription
            </label>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              TVOD Price (optional)
            </label>
            <input
              type="number"
              min={0}
              step={0.01}
              value={form.tvodPrice ?? ""}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  tvodPrice: e.target.value ? Number(e.target.value) : undefined,
                }))
              }
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
            />
          </div>
        </div>

        <div className="space-y-4 border-t border-slate-200 pt-6 dark:border-slate-700">
          <h3 className="font-medium text-slate-900 dark:text-slate-100">URLs</h3>
          {(["posterUrl", "backdropUrl", "trailerUrl", "streamingUrl"] as const).map((key) => (
            <div key={key}>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                {key.replace("Url", " URL")}
              </label>
              <input
                type="url"
                value={form[key] ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
              />
            </div>
          ))}
        </div>

        <div className="flex gap-3 border-t border-slate-200 pt-6 dark:border-slate-700">
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-primary-600 px-4 py-2.5 font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {loading ? "Saving…" : isNew ? "Create" : "Update"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/content/movies")}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
