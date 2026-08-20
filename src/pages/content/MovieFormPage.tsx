import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { contentApi } from "../../api/content";
import { uploadApi } from "../../api/upload";
import { toast } from "../../components/ui/Toast";
import type { ContentStatus } from "../../types/models";

// ─── Field name normaliser ────────────────────────────────────────────────────
// The backend returns snake_case. The form uses camelCase internally.
// This ensures every edit always pre-fills correctly regardless of which
// casing the backend sends, and the outgoing payload is always snake_case.

function normaliseMovieFromBackend(raw: any): FormState {
  // Accept both snake_case (backend) and camelCase (frontend cache) spellings
  return {
    title:                  raw.title                   ?? "",
    description:            raw.description             ?? "",
    releaseYear:            raw.release_year            ?? raw.releaseYear            ?? new Date().getFullYear(),
    duration:               raw.duration                ?? 0,
    language:               raw.language                ?? "en",
    ratingVisible:          raw.rating_visible          ?? raw.ratingVisible          ?? true,
    posterUrl:              raw.poster_url              ?? raw.posterUrl              ?? "",
    backdropUrl:            raw.backdrop_url            ?? raw.backdropUrl            ?? "",
    trailerUrl:             raw.trailer_url             ?? raw.trailerUrl             ?? "",
    streamingUrl:           raw.streaming_url           ?? raw.streamingUrl           ?? "",
    tvodPrice:              raw.tvod_price              ?? raw.tvodPrice              ?? undefined,
    includedInSubscription: raw.included_in_subscription ?? raw.includedInSubscription ?? false,
    status:                 raw.status                  ?? "published",
    videoQuality:           raw.video_quality           ?? raw.videoQuality           ?? "1080p",
    genres:                 raw.genres                  ?? [],
    cast:                   normaliseCast(raw.cast)     ?? [],
    filmmakerIds:           raw.filmmaker_ids           ?? raw.filmmakerIds           ?? [],
  };
}

/** Cast can come as [{name, role}] or [{actor_name, character}] — normalise to {name, role} */
function normaliseCast(cast: any[]): { name: string; role: string }[] {
  if (!Array.isArray(cast)) return [];
  return cast.map((c) => ({
    name: c.name ?? c.actor_name ?? c.actorName ?? "",
    role: c.role ?? c.character ?? c.characterName ?? "",
  }));
}

function buildPayload(form: FormState, urls: { poster: string; backdrop: string; trailer: string }) {
  return {
    title:                    form.title,
    description:              form.description,
    release_year:             form.releaseYear,
    duration:                 form.duration,
    language:                 form.language,
    rating_visible:           form.ratingVisible,
    poster_url:               urls.poster,
    backdrop_url:             urls.backdrop,
    trailer_url:              urls.trailer,
    tvod_price:               form.tvodPrice,
    included_in_subscription: form.includedInSubscription,
    status:                   form.status,
    video_quality:            form.videoQuality,
    cast:                     form.cast,
    genres:                   form.genres,
    filmmaker_ids:            form.filmmakerIds,
  };
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormState {
  title: string;
  description: string;
  releaseYear: number;
  duration: number;
  language: string;
  ratingVisible: boolean;
  posterUrl: string;
  backdropUrl: string;
  trailerUrl: string;
  streamingUrl: string;
  tvodPrice: number | undefined;
  includedInSubscription: boolean;
  status: string;
  videoQuality: string;
  genres: string[];
  cast: { name: string; role: string }[];
  filmmakerIds: string[];
}

const emptyForm: FormState = {
  title: "",
  description: "",
  releaseYear: new Date().getFullYear(),
  duration: 0,
  language: "en",
  ratingVisible: true,
  posterUrl: "",
  backdropUrl: "",
  trailerUrl: "",
  streamingUrl: "",
  tvodPrice: undefined,
  includedInSubscription: false,
  status: "published",
  videoQuality: "1080p",
  genres: [],
  cast: [],
  filmmakerIds: [],
};

// ─── Component ────────────────────────────────────────────────────────────────

export function MovieFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isNew = id === "new" || !id;

  const [form, setForm] = useState<FormState>(emptyForm);
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [backdropFile, setBackdropFile] = useState<File | null>(null);
  const [trailerFile, setTrailerFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState("");

  // ── Fetch existing movie data ───────────────────────────────────────────────
  const { data: rawMovie, isLoading } = useQuery({
    queryKey: ["content", "movies", id],
    queryFn: () => contentApi.movies.get(id!),
    enabled: !isNew,
    // Always re-fetch from server when navigating to this page
    staleTime: 0,
  });

  // Populate form whenever we get fresh data from backend
  useEffect(() => {
    if (rawMovie) {
      setForm(normaliseMovieFromBackend(rawMovie));
    }
  }, [rawMovie]);

  // ── Mutations ──────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (body: any) => contentApi.movies.create(body),
    onError: (err: any) => toast(extractError(err, "Create failed"), "error"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ movieId, body }: { movieId: string; body: any }) =>
      contentApi.movies.update(movieId, body),
    onError: (err: any) => toast(extractError(err, "Update failed"), "error"),
  });

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isNew && !id) return;

    if (isNew && (!posterFile || !backdropFile || !videoFile)) {
      toast("Poster, Backdrop, and Video are required for new content", "error");
      return;
    }

    if (!form.title.trim() || !form.description.trim()) {
      toast("Title and description are required.", "error");
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);

      // ── 1. Upload images/trailer to S3 ─────────────────────────────────────
      let finalPosterUrl   = form.posterUrl   || "";
      let finalBackdropUrl = form.backdropUrl || "";
      let finalTrailerUrl  = form.trailerUrl  || "";

      if (posterFile) {
        setUploadStatus("Uploading poster...");
        const res = await uploadApi.uploadFileFlow(posterFile, "poster", (p) =>
          setUploadProgress(p * 0.1)
        );
        finalPosterUrl = res.fileUrl;
      }
      if (backdropFile) {
        setUploadStatus("Uploading backdrop...");
        const res = await uploadApi.uploadFileFlow(backdropFile, "backdrop", (p) =>
          setUploadProgress(10 + p * 0.1)
        );
        finalBackdropUrl = res.fileUrl;
      }
      if (trailerFile) {
        setUploadStatus("Uploading trailer...");
        const res = await uploadApi.uploadFileFlow(trailerFile, "trailer", (p) =>
          setUploadProgress(20 + p * 0.1)
        );
        finalTrailerUrl = res.fileUrl;
      }

      setUploadProgress(30);

      // ── 2. Create or update metadata ───────────────────────────────────────
      const payload = buildPayload(form, {
        poster:   finalPosterUrl,
        backdrop: finalBackdropUrl,
        trailer:  finalTrailerUrl,
      });

      let movieId = id;
      setUploadStatus(isNew ? "Creating movie..." : "Saving changes...");

      if (isNew) {
        const res: any = await createMutation.mutateAsync(payload);
        movieId =
          res?.data?.movie?.id ?? res?.data?.id ?? res?.movie?.id ?? res?.id;
        if (!movieId) throw new Error("No movie ID returned from server after create.");
      } else {
        await updateMutation.mutateAsync({ movieId: id!, body: payload });
        movieId = id;
      }

      setUploadProgress(50);

      // ── 3. Upload main video file ──────────────────────────────────────────
      if (movieId && videoFile) {
        setUploadStatus("Uploading video file...");
        const videoFormData = new FormData();
        videoFormData.append("video", videoFile);
        videoFormData.append("quality", form.videoQuality || "1080p");
        videoFormData.append(
          "duration_seconds",
          ((form.duration || 120) * 60).toString()
        );

        await contentApi.movies.addVideoFile(
          movieId,
          videoFormData,
          (progressEvent: any) => {
            if (progressEvent.total) {
              const p = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total
              );
              setUploadProgress(50 + Math.floor(p / 2));
            }
          }
        );
      }

      setUploadProgress(100);
      setUploadStatus("Done!");
      queryClient.invalidateQueries({ queryKey: ["content", "movies"] });
      toast(isNew ? "Movie created successfully" : "Movie updated successfully", "success");

      setTimeout(() => navigate("/content/movies"), 600);
    } catch (err: any) {
      toast(extractError(err, "Save failed"), "error");
    } finally {
      setIsUploading(false);
    }
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
  const set = (patch: Partial<FormState>) =>
    setForm((f) => ({ ...f, ...patch }));

  const loading = isLoading || isUploading;

  if (!isNew && isLoading) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
        <p className="text-sm text-slate-500 dark:text-slate-400">Loading movie data...</p>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          {isNew ? "Add Movie" : `Edit: ${form.title || "…"}`}
        </h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">
          {isNew ? "Create a new movie or show" : "Update movie details — all fields pre-filled from backend"}
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800"
      >
        {/* ── Basic Info ─────────────────────────────────────────────────── */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Basic Information
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Title */}
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={form.title}
                onChange={(e) => set({ title: e.target.value })}
                className={inputCls}
              />
            </div>

            {/* Description */}
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={4}
                required
                value={form.description}
                onChange={(e) => set({ description: e.target.value })}
                className={inputCls}
              />
            </div>

            {/* Release Year */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Release Year
              </label>
              <input
                type="number"
                min={1900}
                max={2100}
                value={form.releaseYear}
                onChange={(e) => set({ releaseYear: Number(e.target.value) || new Date().getFullYear() })}
                className={inputCls}
              />
            </div>

            {/* Duration */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Duration (minutes)
              </label>
              <input
                type="number"
                min={0}
                value={form.duration}
                onChange={(e) => set({ duration: Number(e.target.value) || 0 })}
                className={inputCls}
              />
            </div>

            {/* Language */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Language
              </label>
              <input
                type="text"
                value={form.language}
                onChange={(e) => set({ language: e.target.value })}
                className={inputCls}
              />
            </div>

            {/* Status */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Status
              </label>
              <select
                value={form.status}
                onChange={(e) => set({ status: e.target.value as ContentStatus })}
                className={inputCls}
              >
                <option value="approved">Approved</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            {/* Video Quality */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Video Quality
              </label>
              <select
                value={form.videoQuality}
                onChange={(e) => set({ videoQuality: e.target.value })}
                className={inputCls}
              >
                <option value="480p">480p</option>
                <option value="720p">720p</option>
                <option value="1080p">1080p</option>
                <option value="1440p">1440p</option>
                <option value="4K">4K</option>
              </select>
            </div>

            {/* TVOD Price */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                TVOD Price <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                required
                min={0.01}
                step={0.01}
                value={form.tvodPrice ?? ""}
                onChange={(e) =>
                  set({ tvodPrice: e.target.value ? Number(e.target.value) : undefined })
                }
                className={inputCls}
              />
            </div>

            {/* Checkboxes */}
            <div className="flex flex-col gap-3 sm:col-span-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.ratingVisible}
                  onChange={(e) => set({ ratingVisible: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">Rating visible</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.includedInSubscription}
                  onChange={(e) => set({ includedInSubscription: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">Included in subscription</span>
              </label>
            </div>
          </div>
        </section>

        {/* ── Cast ───────────────────────────────────────────────────────── */}
        <section className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Cast
            </h2>
            <button
              type="button"
              onClick={() => set({ cast: [...form.cast, { name: "", role: "" }] })}
              className="text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400"
            >
              + Add Member
            </button>
          </div>
          {form.cast.length === 0 ? (
            <p className="text-sm italic text-slate-500 dark:text-slate-400">No cast members added yet.</p>
          ) : (
            form.cast.map((member, idx) => (
              <div key={idx} className="flex gap-3 items-start">
                <input
                  type="text"
                  placeholder="Name"
                  value={member.name}
                  onChange={(e) => {
                    const cast = [...form.cast];
                    cast[idx] = { ...cast[idx], name: e.target.value };
                    set({ cast });
                  }}
                  className={`${inputCls} flex-1`}
                />
                <input
                  type="text"
                  placeholder="Role"
                  value={member.role}
                  onChange={(e) => {
                    const cast = [...form.cast];
                    cast[idx] = { ...cast[idx], role: e.target.value };
                    set({ cast });
                  }}
                  className={`${inputCls} flex-1`}
                />
                <button
                  type="button"
                  onClick={() => {
                    const cast = [...form.cast];
                    cast.splice(idx, 1);
                    set({ cast });
                  }}
                  className="mt-2 text-sm font-medium text-red-500 hover:text-red-700"
                >
                  Remove
                </button>
              </div>
            ))
          )}
        </section>

        {/* ── Media Uploads ───────────────────────────────────────────────── */}
        <section className="space-y-4 border-t border-slate-200 pt-6 dark:border-slate-700">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Media Uploads
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Poster */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Poster Image {isNew && <span className="text-red-500">*</span>}
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setPosterFile(e.target.files?.[0] || null)}
                className={inputCls}
              />
              {!isNew && form.posterUrl && (
                <div className="mt-2 flex items-center gap-2">
                  <img src={form.posterUrl} alt="Current poster" className="h-16 w-12 rounded object-cover ring-1 ring-slate-200 dark:ring-slate-600" />
                  <span className="text-xs text-slate-500 dark:text-slate-400">Current — leave empty to keep</span>
                </div>
              )}
            </div>

            {/* Backdrop */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Backdrop Image {isNew && <span className="text-red-500">*</span>}
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setBackdropFile(e.target.files?.[0] || null)}
                className={inputCls}
              />
              {!isNew && form.backdropUrl && (
                <div className="mt-2 flex items-center gap-2">
                  <img src={form.backdropUrl} alt="Current backdrop" className="h-10 w-16 rounded object-cover ring-1 ring-slate-200 dark:ring-slate-600" />
                  <span className="text-xs text-slate-500 dark:text-slate-400">Current — leave empty to keep</span>
                </div>
              )}
            </div>

            {/* Trailer */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Trailer Video
              </label>
              <input
                type="file"
                accept="video/*"
                onChange={(e) => setTrailerFile(e.target.files?.[0] || null)}
                className={inputCls}
              />
              {!isNew && form.trailerUrl && (
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  ✓ Trailer exists — leave empty to keep
                </p>
              )}
            </div>

            {/* Main Video */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Main Video File {isNew && <span className="text-red-500">*</span>}
              </label>
              <input
                type="file"
                accept="video/*"
                onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                className={inputCls}
              />
              {!isNew && (
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Leave empty to keep existing video
                </p>
              )}
            </div>
          </div>
        </section>

        {/* ── Upload Progress ─────────────────────────────────────────────── */}
        {isUploading && (
          <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/40">
            <div className="flex justify-between text-sm">
              <span className="text-slate-700 dark:text-slate-300">{uploadStatus}</span>
              <span className="font-medium text-primary-600">{Math.round(uploadProgress)}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
              <div
                className="h-full bg-primary-600 transition-all duration-300 ease-out"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* ── Actions ─────────────────────────────────────────────────────── */}
        <div className="flex gap-3 border-t border-slate-200 pt-6 dark:border-slate-700">
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-primary-600 px-5 py-2.5 font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {isUploading ? uploadStatus || "Uploading…" : loading ? "Saving…" : isNew ? "Create" : "Save Changes"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/content/movies")}
            disabled={isUploading}
            className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Shared input class ────────────────────────────────────────────────────────
const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100";

// ─── Error extractor ───────────────────────────────────────────────────────────
function extractError(err: any, fallback: string): string {
  return (
    err?.response?.data?.message ??
    err?.response?.data?.error ??
    (typeof err?.response?.data === "string" ? err.response.data : null) ??
    err?.message ??
    fallback
  );
}
