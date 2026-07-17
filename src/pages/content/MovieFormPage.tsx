import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { contentApi } from "../../api/content";
import { uploadApi } from "../../api/upload";
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

  // File Upload State
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [backdropFile, setBackdropFile] = useState<File | null>(null);
  const [trailerFile, setTrailerFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

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
    // Navigation is handled by handleSubmit after all uploads complete
    onError: (err: Error) => toast(err.message ?? "Create failed", "error"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id: movieId, body }: { id: string; body: Partial<Movie> }) =>
      contentApi.movies.update(movieId, body),
    // Navigation is handled by handleSubmit after all uploads complete
    onError: (err: Error) => toast(err.message ?? "Update failed", "error"),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isNew && !id) return;

    if (isNew && (!posterFile || !backdropFile || !videoFile)) {
      toast("Poster, Backdrop, and Video are required for new movies", "error");
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);

      let finalPosterUrl = form.posterUrl || "";
      let finalBackdropUrl = form.backdropUrl || "";
      let finalTrailerUrl = form.trailerUrl || "";

      // Upload files via S3 presigned URLs
      if (posterFile) {
        const res = await uploadApi.uploadFileFlow(posterFile, "poster", (p) => setUploadProgress(p * 0.1));
        finalPosterUrl = res.fileUrl;
      }
      if (backdropFile) {
        const res = await uploadApi.uploadFileFlow(backdropFile, "backdrop", (p) => setUploadProgress(10 + (p * 0.1)));
        finalBackdropUrl = res.fileUrl;
      }
      if (trailerFile) {
        const res = await uploadApi.uploadFileFlow(trailerFile, "trailer", (p) => setUploadProgress(20 + (p * 0.1)));
        finalTrailerUrl = res.fileUrl;
      }

      setUploadProgress(30);

      // Construct JSON payload for the main API request
      const payload: any = {
        title: form.title || "",
        description: form.description || "",
        cast: [
          {
            name: "Unknown Actor",
            role: "Lead Actor",
          }
        ],
        video_quality: "1080p",
        poster_url: finalPosterUrl,
        backdrop_url: finalBackdropUrl,
        trailer_url: finalTrailerUrl,
      };

      if (!isNew) {
        payload._method = "PUT";
      }

      let movieId = id;
      if (isNew) {
        const res: any = await createMutation.mutateAsync(payload);
        // Backend returns: { success: true, data: { movie: { id: "..." } } }
        movieId = res?.data?.movie?.id || res?.data?.id || res?.movie?.id || res?.id;
      } else {
        await updateMutation.mutateAsync({ id, body: payload });
      }

      setUploadProgress(50);

      // Upload video directly to backend via multipart/form-data
      if (movieId && videoFile) {
        const videoFormData = new FormData();
        videoFormData.append("video", videoFile);
        videoFormData.append("quality", "1080p");
        videoFormData.append("duration_seconds", ((form.duration || 120) * 60).toString());

        await contentApi.movies.addVideoFile(movieId as string, videoFormData, (progressEvent: any) => {
          if (progressEvent.total) {
            const p = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(50 + Math.floor(p / 2));
          }
        });
      }

      setUploadProgress(100);
      queryClient.invalidateQueries({ queryKey: ["content", "movies"] });
      toast(isNew ? "Movie created successfully" : "Movie updated successfully", "success");

      // Short delay so the user can see 100% before redirect
      setTimeout(() => {
        navigate("/content/movies");
      }, 600);

    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err.message ||
        "Upload failed";
      toast(msg, "error");
    } finally {
      setIsUploading(false);
    }
  };

  const loading = isLoading || isUploading;

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

        {/* Media Uploads */}
        <div className="space-y-4 border-t border-slate-200 pt-6 dark:border-slate-700">
          <h3 className="font-medium text-slate-900 dark:text-slate-100">Media Uploads</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Poster Image {isNew && <span className="text-red-500">*</span>}
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setPosterFile(e.target.files?.[0] || null)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
              />
              {!isNew && form.posterUrl && <p className="text-xs text-slate-500 mt-1">Leave empty to keep existing.</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Backdrop Image {isNew && <span className="text-red-500">*</span>}
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setBackdropFile(e.target.files?.[0] || null)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
              />
              {!isNew && form.backdropUrl && <p className="text-xs text-slate-500 mt-1">Leave empty to keep existing.</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Trailer Video
              </label>
              <input
                type="file"
                accept="video/*"
                onChange={(e) => setTrailerFile(e.target.files?.[0] || null)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
              />
              {!isNew && form.trailerUrl && <p className="text-xs text-slate-500 mt-1">Leave empty to keep existing.</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Main Movie File {isNew && <span className="text-red-500">*</span>}
              </label>
              <input
                type="file"
                accept="video/*"
                onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
              />
              {!isNew && <p className="text-xs text-slate-500 mt-1">Upload a new file to replace.</p>}
            </div>
          </div>
        </div>

        {isUploading && (
          <div className="space-y-2 border-t border-slate-200 pt-6 dark:border-slate-700">
            <div className="flex justify-between text-sm">
              <span className="text-slate-700 dark:text-slate-300">Uploading media...</span>
              <span className="font-medium text-primary-600">{Math.round(uploadProgress)}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
              <div
                className="h-full bg-primary-600 transition-all duration-300 ease-out"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex gap-3 border-t border-slate-200 pt-6 dark:border-slate-700">
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-primary-600 px-4 py-2.5 font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {isUploading ? "Uploading…" : loading ? "Saving…" : isNew ? "Create" : "Update"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/content/movies")}
            disabled={isUploading}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
