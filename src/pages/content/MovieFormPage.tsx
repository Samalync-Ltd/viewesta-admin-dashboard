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

      let totalFiles = 0;
      if (posterFile) totalFiles++;
      if (backdropFile) totalFiles++;
      if (trailerFile) totalFiles++;
      if (videoFile) totalFiles++;

      let uploadedFiles = 0;
      const onProgress = (p: number) => {
        const overall = (uploadedFiles * 100 + p) / (totalFiles || 1);
        setUploadProgress(Math.min(overall, 99));
      };

      const uploadAsset = async (file: File | null, type: string) => {
        if (!file) return null;
        const res = await uploadApi.uploadFileFlow(file, type, onProgress);
        uploadedFiles++;
        return res;
      };

      const posterData = await uploadAsset(posterFile, "poster");
      const backdropData = await uploadAsset(backdropFile, "backdrop");
      const trailerData = await uploadAsset(trailerFile, "trailer");
      const videoData = await uploadAsset(videoFile, "video");

      const payload: any = {
        ...form,
        posterUrl: posterData ? posterData.fileUrl : form.posterUrl,
        backdropUrl: backdropData ? backdropData.fileUrl : form.backdropUrl,
        trailerUrl: trailerData ? trailerData.fileUrl : form.trailerUrl,
      };

      if (trailerData) {
        payload.trailer_video = {
          file_url: trailerData.fileUrl,
          file_size: trailerData.fileSize,
          duration_seconds: 120, // default
          s3_key: trailerData.s3Key,
          is_processed: false,
        };
      }

      // We explicitly map the frontend naming conventions if backend requires it.
      // Often, the backend maps snake_case. Here we use the payload that backend expects.
      const apiPayload = {
         ...payload,
         content_type: "movie",
         poster_url: payload.posterUrl,
         backdrop_url: payload.backdropUrl,
         trailer_url: payload.trailerUrl,
         release_date: payload.releaseYear ? `${payload.releaseYear}-01-01` : undefined,
         duration_minutes: payload.duration,
      };

      setUploadProgress(99);

      let movieId = id;
      if (isNew) {
        const res: any = await createMutation.mutateAsync(apiPayload);
        // Backend returns: { success: true, data: { movie: { id: "..." } } }
        movieId = res?.data?.movie?.id || res?.data?.id || res?.movie?.id || res?.id;
      } else {
        await updateMutation.mutateAsync({ id, body: apiPayload });
      }

      if (movieId && videoData) {
        await contentApi.movies.addVideoFile(movieId as string, {
          quality: "1080p",
          file_url: videoData.fileUrl,
          file_size: videoData.fileSize,
          duration_seconds: (form.duration || 120) * 60,
          s3_key: videoData.s3Key,
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
