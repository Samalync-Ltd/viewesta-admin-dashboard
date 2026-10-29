import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { contentApi, type ContentMediaFiles } from "../../api/content";
import { toast } from "../../components/ui/Toast";
import { PendingReviewBanner } from "../../components/ui/PendingReviewBanner";
import { PreviewButton, type MediaLinks, type PreviewSource } from "../../components/ui/MediaPreview";
import { useMediaPreview } from "../../components/ui/useMediaPreview";
import { filmmakersApi, filmmakerLabel } from "../../api/filmmakers";
import { ImageWithFallback } from "../../components/ui/ImageWithFallback";
import { CONTENT_STATUSES, STATUS_LABELS } from "../../lib/contentStatus";
import { AGE_RATINGS, VIDEO_QUALITIES } from "../../lib/contentOptions";
import type { Category } from "../../types/models";

/**
 * One pay-per-view price per film. It applies to every quality, so on save the
 * same price is written to each quality tier of /movies/:id/pricing.
 */
interface PriceState {
  isFree: boolean;
  price: string;
}

const emptyPricing = (): PriceState => ({ isFree: false, price: "" });

/**
 * ── Why this form only exposes these fields ──────────────────────────────────
 *
 * `Movie.update()` writes a strict whitelist:
 *   title, description, synopsis, age_rating, director_name, producer_name,
 *   poster_url, backdrop_url, trailer_url, release_date, duration_minutes,
 *   category_id, language, country, status, is_featured, content_type
 *
 * and `validate(movieValidation.update)` runs with `stripUnknown: true`.
 * Anything else (price, included_in_subscription, video_quality, genres,
 * rating_visible, filmmaker_ids, release_year) is dropped without a word —
 * which is what made saves report success while changing nothing.
 *
 * Media is sent as multipart files (poster/backdrop/trailer), never as *_url:
 * the routes mount `rejectLegacyMediaFields`, which 400s on any *_url key.
 *
 * TVOD price is NOT a movie column — it lives in `movie_pricing`, keyed by
 * (movie_id, quality), and is written through /movies/:movieId/pricing.
 * That is why the pricing block below saves separately from the movie itself.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface FormState {
  title: string;
  description: string;
  synopsis: string;
  releaseYear: number;
  duration: number;
  language: string;
  country: string;
  status: string;
  ageRating: string;
  directorName: string;
  producerName: string;
  categoryId: string;
  isFeatured: boolean;
  videoQuality: string;
  cast: { name: string; role: string; character: string }[];
  // Read-only previews of what the backend currently stores.
  posterUrl: string;
  backdropUrl: string;
  trailerUrl: string;
  /** Chosen when creating a movie; read-only afterwards (see note in the form). */
  filmmakerId: string;
  filmmakerName: string;
}

const emptyForm: FormState = {
  title: "",
  description: "",
  synopsis: "",
  releaseYear: new Date().getFullYear(),
  duration: 0,
  language: "",
  country: "",
  status: "approved",
  ageRating: "",
  directorName: "",
  producerName: "",
  categoryId: "",
  isFeatured: false,
  videoQuality: "720p",
  cast: [],
  posterUrl: "",
  backdropUrl: "",
  trailerUrl: "",
  filmmakerId: "",
  filmmakerName: "",
};

function normaliseMovieFromBackend(raw: any): FormState {
  return {
    title: raw.title ?? "",
    description: raw.description ?? "",
    synopsis: raw.synopsis ?? "",
    releaseYear: raw.release_date
      ? new Date(raw.release_date).getFullYear()
      : (raw.release_year ?? new Date().getFullYear()),
    duration: Number(raw.duration_minutes ?? 0) || 0,
    language: raw.language ?? "",
    country: raw.country ?? "",
    status: raw.status ?? "approved",
    ageRating: raw.age_rating ?? "",
    directorName: raw.director_name ?? "",
    producerName: raw.producer_name ?? "",
    categoryId: raw.category_id ?? "",
    isFeatured: Boolean(raw.is_featured),
    videoQuality: "720p",
    cast: normaliseCast(raw.cast),
    posterUrl: raw.poster_url ?? "",
    backdropUrl: raw.backdrop_url ?? "",
    trailerUrl: raw.trailer_url ?? "",
    filmmakerId: raw.filmmaker_id ?? "",
    filmmakerName:
      [raw.filmmaker_first_name, raw.filmmaker_last_name].filter(Boolean).join(" ").trim() ||
      raw.filmmaker_email ||
      "",
  };
}

/** Cast arrives as [{actor_name, character_name}] or [{name, character}]. */
function normaliseCast(cast: any): { name: string; role: string; character: string }[] {
  if (!Array.isArray(cast)) return [];
  return cast.map((c) => ({
    name: c.name ?? c.actor_name ?? c.actorName ?? "",
    role: c.role ?? "",
    character: c.character ?? c.character_name ?? c.characterName ?? "",
  }));
}

/**
 * Only fields the backend actually persists. Empty values are omitted rather
 * than sent as "" so we never blank a stored column, and `category_id` /
 * `age_rating` are dropped unless valid — both would otherwise 400 on Joi.
 */
function buildFields(form: FormState): Record<string, unknown> {
  const fields: Record<string, unknown> = {
    title: form.title.trim(),
    description: form.description.trim(),
    release_date: `${form.releaseYear}-01-01`,
    is_featured: form.isFeatured,
    status: form.status,
  };

  if (form.synopsis.trim()) fields.synopsis = form.synopsis.trim();
  if (form.duration > 0) fields.duration_minutes = form.duration;
  if (form.language.trim()) fields.language = form.language.trim();
  if (form.country.trim()) fields.country = form.country.trim();
  if (form.directorName.trim()) fields.director_name = form.directorName.trim();
  if (form.producerName.trim()) fields.producer_name = form.producerName.trim();
  if (AGE_RATINGS.includes(form.ageRating as any)) fields.age_rating = form.ageRating;
  if (form.categoryId) fields.category_id = form.categoryId;

  // Joi requires `cast` to be a non-empty array when present, and every member
  // needs a non-empty name AND role.
  const cast = form.cast
    .filter((c) => c.name.trim() && c.role.trim())
    .map((c) => ({
      name: c.name.trim(),
      role: c.role.trim(),
      character: c.character.trim(),
    }));
  if (cast.length > 0) fields.cast = cast;

  return fields;
}

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
  const [pricing, setPricing] = useState<PriceState>(emptyPricing);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState("");

  const { data: categories } = useQuery({
    queryKey: ["content", "categories"],
    queryFn: contentApi.categories.list,
    staleTime: 5 * 60 * 1000,
  });

  // Filmmakers are users with user_type='filmmaker' (no /filmmakers resource),
  // the same list the show upload offers. Only needed when creating.
  const { data: filmmakers, isError: filmmakersError } = useQuery({
    queryKey: ["filmmakers", "options"],
    queryFn: () => filmmakersApi.listOptions(),
    enabled: isNew,
    staleTime: 5 * 60 * 1000,
  });

  const { data: rawMovie, isLoading } = useQuery({
    queryKey: ["content", "movies", id],
    queryFn: () => contentApi.movies.get(id!),
    enabled: !isNew,
    staleTime: 0,
  });

  useEffect(() => {
    if (rawMovie) setForm(normaliseMovieFromBackend(rawMovie));
  }, [rawMovie]);

  // Pricing is a separate resource, so it needs its own fetch.
  const { data: existingPricing } = useQuery({
    queryKey: ["content", "movies", id, "pricing"],
    queryFn: () => contentApi.pricing.list(id!),
    enabled: !isNew,
    staleTime: 0,
  });

  useEffect(() => {
    if (!existingPricing) return;
    if (existingPricing.length === 0) {
      setPricing(emptyPricing());
      return;
    }
    // Older films may carry a different price per quality; show the highest.
    const paid = existingPricing.filter((r) => !r.is_free);
    setPricing(
      paid.length === 0
        ? { isFree: true, price: "" }
        : { isFree: false, price: String(Math.max(...paid.map((r) => Number(r.price ?? 0)))) }
    );
  }, [existingPricing]);

  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));

  // ── Review the uploaded media ──────────────────────────────────
  // Every preview re-reads the movie first: its links are signed and expire,
  // so the copy loaded with the page may no longer open.
  const { preview, modal: previewModal } = useMediaPreview();
  const one = (label: string, url?: string | null): PreviewSource[] => (url ? [{ label, url }] : []);
  const previewMovieField = (title: string, kind: "image" | "video", pick: (m: MediaLinks) => string | null | undefined) =>
    preview({ title, kind, load: async () => one(title, pick((await contentApi.movies.get(id!)) as MediaLinks)) });
  const previewMainVideo = () =>
    preview({
      title: `${form.title || "Movie"} — uploaded video`,
      kind: "video",
      load: async () => (await contentApi.movies.videoFiles(id!)).map((f) => ({ label: f.quality, url: f.url })),
    });

  // ── Approval mutations ──────────────────────────────────────────
  const approveMutation = useMutation({
    mutationFn: () => contentApi.movies.approve(id!),
    onSuccess: () => {
      toast("Movie approved — the filmmaker has been notified.", "success");
      queryClient.invalidateQueries({ queryKey: ["content", "movies"] });
      navigate("/content/movies");
    },
    onError: (err: any) => toast(extractError(err, "Approval failed"), "error"),
  });

  const rejectMutation = useMutation({
    mutationFn: (reason: string) => contentApi.movies.reject(id!, reason),
    onSuccess: () => {
      toast("Movie rejected — the filmmaker has been notified.", "success");
      queryClient.invalidateQueries({ queryKey: ["content", "movies"] });
      navigate("/content/movies");
    },
    onError: (err: any) => toast(extractError(err, "Rejection failed"), "error"),
  });

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.title.trim() || !form.description.trim()) {
      toast("Title and description are required.", "error");
      return;
    }
    if (form.duration <= 0) {
      toast("Duration must be greater than 0 minutes.", "error");
      return;
    }
    // `movieValidation.create` marks cast as required with min(1).
    const validCast = form.cast.filter((c) => c.name.trim() && c.role.trim());
    if (isNew && validCast.length === 0) {
      toast("At least one cast member (name + role) is required.", "error");
      return;
    }
    if (isNew && (!posterFile || !backdropFile)) {
      toast("Poster and backdrop images are required for new content.", "error");
      return;
    }

    // Empty price = no pay-per-view for this film; otherwise it must be a valid number.
    if (!pricing.isFree && pricing.price !== "" && !(Number(pricing.price) >= 0)) {
      toast("Enter a valid pay-per-view price, or leave it empty.", "error");
      return;
    }

    const files: ContentMediaFiles = {
      poster: posterFile,
      backdrop: backdropFile,
      trailer: trailerFile,
    };

    try {
      setIsSaving(true);
      setUploadProgress(5);

      const fields = buildFields(form);
      let movieId = id;
      let filmmakerNotStored = false;

      if (isNew) {
        // `movieValidation.create` has no `status` key, and createMovie forces
        // 'approved' for admins — so the chosen status is applied afterwards.
        setUploadStatus("Creating movie...");
        const { status, ...createFields } = fields;
        const chosenFilmmaker = UUID_RE.test(form.filmmakerId) ? form.filmmakerId : "";
        if (chosenFilmmaker) createFields.filmmaker_id = chosenFilmmaker;
        const created = await contentApi.movies.create(createFields, files);
        movieId = created?.id;
        if (!movieId) throw new Error("No movie ID returned from server after create.");
        // The backend has dropped filmmaker_id on movie create before (see the
        // note by the Filmmaker field), so only report it as assigned if the
        // created movie really carries it.
        if (chosenFilmmaker && created?.filmmaker_id !== chosenFilmmaker) {
          filmmakerNotStored = true;
        }

        if (status && status !== "approved") {
          await contentApi.movies.update(movieId, { status });
        }
      } else {
        setUploadStatus("Saving changes...");
        // Files are omitted when nothing new was picked, which leaves the
        // stored poster/backdrop/trailer untouched server-side.
        const updated = await contentApi.movies.update(id!, fields, files);
        movieId = id;
        // Re-seed the form from the server's response so the UI shows exactly
        // what was persisted rather than what we hoped was persisted.
        if (updated?.id) setForm(normaliseMovieFromBackend(updated));
      }

      setUploadProgress(50);

      if (movieId && videoFile) {
        setUploadStatus("Uploading video file...");
        const videoFormData = new FormData();
        videoFormData.append("video", videoFile);
        videoFormData.append("quality", form.videoQuality);
        videoFormData.append("duration_seconds", String((form.duration || 1) * 60));

        await contentApi.movies.addVideoFile(movieId, videoFormData, (progressEvent: any) => {
          if (progressEvent.total) {
            const p = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(50 + Math.floor(p / 2));
          }
        });
      }

      // ── TVOD pricing (separate resource, needs an existing movie id) ──────
      if (movieId) {
        setUploadStatus("Saving pricing...");
        const previous = new Set((existingPricing ?? []).map((r) => r.quality));
        const hasPrice = pricing.isFree || pricing.price !== "";
        const body = { price: pricing.isFree ? 0 : Number(pricing.price) || 0, is_free: pricing.isFree };

        if (hasPrice) {
          try {
            // One price for the whole film (the backend applies it to every quality).
            await contentApi.pricing.setSingle(movieId, body);
          } catch (err: any) {
            // A backend that still wants one row per quality rejects the request
            // without `quality`; write the same price to each tier instead.
            if (![400, 422].includes(err?.response?.status)) throw err;
            for (const quality of VIDEO_QUALITIES) {
              await contentApi.pricing.set(movieId, { quality, ...body });
            }
          }
        } else {
          // Price cleared -> remove what was there.
          for (const quality of VIDEO_QUALITIES) {
            if (previous.has(quality)) await contentApi.pricing.remove(movieId, quality);
          }
        }

        // Read it back: the save only counts if the backend now returns this price.
        if (hasPrice) {
          const rows = await contentApi.pricing.list(movieId);
          const stored = rows.find((r) => !r.is_free);
          const ok = pricing.isFree
            ? rows.some((r) => r.is_free)
            : Boolean(stored) && Math.abs(Number(stored!.price) - body.price) < 0.005;
          if (!ok) {
            throw new Error(
              `The server accepted the price but did not store it (GET /movies/${movieId}/pricing returns ` +
                `${rows.length ? JSON.stringify(rows.map((r) => r.price)) : "no price"}). Please report this to the backend team.`
            );
          }
        }
        await queryClient.invalidateQueries({
          queryKey: ["content", "movies", movieId, "pricing"],
        });
      }

      setUploadProgress(100);
      setUploadStatus("Done!");

      // Drop every cached content list AND this movie's detail entry so the
      // list re-fetches from the server instead of rendering stale rows.
      await queryClient.invalidateQueries({ queryKey: ["content", "movies"] });
      toast(isNew ? "Movie created successfully" : "Movie updated successfully", "success");
      if (filmmakerNotStored) {
        toast(
          "The movie was created, but the server did not save the filmmaker you chose. Please report this to the backend team.",
          "error",
        );
      }
      navigate("/content/movies");
    } catch (err: any) {
      toast(extractError(err, "Save failed"), "error");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isNew && isLoading) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
        <p className="text-sm text-slate-500 dark:text-slate-400">Loading movie data...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {previewModal}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          {isNew ? "Add Movie" : `Edit: ${form.title || "…"}`}
        </h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">
          {isNew ? "Create a new movie" : "Update movie details"}
        </p>
      </div>

      {/* ── Pending Review Banner ───────────────────────────────────────── */}
      {!isNew && form.status === "pending" && (
        <PendingReviewBanner
          kind="movie"
          onApprove={() => approveMutation.mutate()}
          onReject={(reason) => rejectMutation.mutate(reason)}
          approving={approveMutation.isPending}
          rejecting={rejectMutation.isPending}
        />
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800"
      >
        <section className="space-y-4">
          <h2 className={sectionCls}>Basic Information</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelCls}>
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                minLength={2}
                maxLength={255}
                value={form.title}
                onChange={(e) => set({ title: e.target.value })}
                className={inputCls}
              />
            </div>

            <div className="sm:col-span-2">
              <label className={labelCls}>
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={4}
                required
                maxLength={1000}
                value={form.description}
                onChange={(e) => set({ description: e.target.value })}
                className={inputCls}
              />
              <p className={hintCls}>{form.description.length}/1000</p>
            </div>

            <div className="sm:col-span-2">
              <label className={labelCls}>Synopsis</label>
              <textarea
                rows={2}
                value={form.synopsis}
                onChange={(e) => set({ synopsis: e.target.value })}
                className={inputCls}
              />
            </div>

            <div>
              <label className={labelCls}>Release Year</label>
              <input
                type="number"
                min={1900}
                max={2100}
                value={form.releaseYear}
                onChange={(e) =>
                  set({ releaseYear: Number(e.target.value) || new Date().getFullYear() })
                }
                className={inputCls}
              />
            </div>

            <div>
              <label className={labelCls}>
                Duration (minutes) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min={1}
                value={form.duration}
                onChange={(e) => set({ duration: Number(e.target.value) || 0 })}
                className={inputCls}
              />
            </div>

            <div>
              <label className={labelCls}>Category</label>
              <select
                value={form.categoryId}
                onChange={(e) => set({ categoryId: e.target.value })}
                className={inputCls}
              >
                <option value="">— None —</option>
                {(categories ?? []).map((c: Category) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelCls}>Age Rating</label>
              <select
                value={form.ageRating}
                onChange={(e) => set({ ageRating: e.target.value })}
                className={inputCls}
              >
                <option value="">— None —</option>
                {AGE_RATINGS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelCls}>Language</label>
              <input
                type="text"
                maxLength={50}
                value={form.language}
                onChange={(e) => set({ language: e.target.value })}
                className={inputCls}
              />
            </div>

            <div>
              <label className={labelCls}>Country</label>
              <input
                type="text"
                maxLength={100}
                value={form.country}
                onChange={(e) => set({ country: e.target.value })}
                className={inputCls}
              />
            </div>

            <div>
              <label className={labelCls}>Status</label>
              <select
                value={form.status}
                onChange={(e) => set({ status: e.target.value })}
                className={inputCls}
              >
                {CONTENT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
              <p className={hintCls}>
                Only <strong>Approved</strong> content is visible to end users.
              </p>
            </div>

            <div className="flex items-end">
              <label className="flex cursor-pointer items-center gap-2 pb-2">
                <input
                  type="checkbox"
                  checked={form.isFeatured}
                  onChange={(e) => set({ isFeatured: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">Featured</span>
              </label>
            </div>
          </div>
        </section>

        <section className="space-y-4 border-t border-slate-200 pt-6 dark:border-slate-700">
          <h2 className={sectionCls}>Production</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Director</label>
              <input
                type="text"
                maxLength={255}
                value={form.directorName}
                onChange={(e) => set({ directorName: e.target.value })}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Producer</label>
              <input
                type="text"
                maxLength={255}
                value={form.producerName}
                onChange={(e) => set({ producerName: e.target.value })}
                className={inputCls}
              />
            </div>

            {/* movies.filmmaker_id is a single, nullable column. It is chosen
                when the movie is created, like a show's filmmaker. Editing it
                later is not possible: it is not in Movie.update()'s whitelist. */}
            <div className="sm:col-span-2">
              <label htmlFor="movie-filmmaker" className={labelCls}>Filmmaker</label>
              {isNew ? (
                <>
                  <select
                    id="movie-filmmaker"
                    value={form.filmmakerId}
                    onChange={(e) => set({ filmmakerId: e.target.value })}
                    className={inputCls}
                  >
                    <option value="">{filmmakersError ? "Could not load filmmakers" : "Unassigned"}</option>
                    {(filmmakers ?? []).map((f) => (
                      <option key={f.id} value={f.id}>{filmmakerLabel(f)}</option>
                    ))}
                  </select>
                  <p className={hintCls}>
                    Attributes the movie to a filmmaker account for revenue splits and payouts.
                  </p>
                </>
              ) : (
                <>
                  <p className="rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-600 dark:border-slate-600 dark:text-slate-400">
                    {form.filmmakerName || form.filmmakerId || "Unassigned"}
                  </p>
                  <p className={hintCls}>
                    Set when the movie is created; the movie update endpoint cannot change it.
                  </p>
                </>
              )}
            </div>
          </div>
        </section>

        <section className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <h2 className={sectionCls}>
              Cast {isNew && <span className="text-red-500">*</span>}
            </h2>
            <button
              type="button"
              onClick={() =>
                set({ cast: [...form.cast, { name: "", role: "", character: "" }] })
              }
              className="text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400"
            >
              + Add Member
            </button>
          </div>
          {form.cast.length === 0 ? (
            <p className="text-sm italic text-slate-500 dark:text-slate-400">
              No cast members added yet.
              {isNew && " At least one is required to create a movie."}
            </p>
          ) : (
            form.cast.map((member, idx) => (
              <div key={idx} className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
                <input
                  type="text"
                  placeholder="Name *"
                  value={member.name}
                  onChange={(e) => updateCast(setForm, idx, { name: e.target.value })}
                  className={inputCls}
                />
                <input
                  type="text"
                  placeholder="Role *"
                  value={member.role}
                  onChange={(e) => updateCast(setForm, idx, { role: e.target.value })}
                  className={inputCls}
                />
                <input
                  type="text"
                  placeholder="Character"
                  value={member.character}
                  onChange={(e) => updateCast(setForm, idx, { character: e.target.value })}
                  className={inputCls}
                />
                <button
                  type="button"
                  onClick={() =>
                    setForm((f) => ({ ...f, cast: f.cast.filter((_, i) => i !== idx) }))
                  }
                  className="text-sm font-medium text-red-500 hover:text-red-700"
                >
                  Remove
                </button>
              </div>
            ))
          )}
        </section>

        <section className="space-y-4 border-t border-slate-200 pt-6 dark:border-slate-700">
          <h2 className={sectionCls}>Media Uploads</h2>
          <p className={hintCls}>
            Files are uploaded directly to the content endpoint as multipart data. Leave a
            field empty to keep whatever is already stored.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>
                Poster Image {isNew && <span className="text-red-500">*</span>}
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setPosterFile(e.target.files?.[0] || null)}
                className={inputCls}
              />
              {/* Renders the bundled placeholder when the URL is null or
                  the presigned S3 link has expired, instead of a broken icon. */}
              {!isNew && (
                <button
                  type="button"
                  onClick={() => previewMovieField("Poster", "image", (m) => m?.poster_url)}
                  className="mt-2 block rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                  aria-label="View the poster full size"
                >
                  <ImageWithFallback
                    src={form.posterUrl}
                    alt="Current poster"
                    className="h-16 w-12 rounded object-cover ring-1 ring-slate-200 dark:ring-slate-600"
                  />
                </button>
              )}
              {!isNew && form.posterUrl && (
                <PreviewButton kind="image" label="View full size" onClick={() => previewMovieField("Poster", "image", (m) => m?.poster_url)} />
              )}
            </div>

            <div>
              <label className={labelCls}>
                Backdrop Image {isNew && <span className="text-red-500">*</span>}
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setBackdropFile(e.target.files?.[0] || null)}
                className={inputCls}
              />
              {/* Renders the bundled placeholder when the URL is null or
                  the presigned S3 link has expired, instead of a broken icon. */}
              {!isNew && (
                <button
                  type="button"
                  onClick={() => previewMovieField("Backdrop", "image", (m) => m?.backdrop_url)}
                  className="mt-2 block rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                  aria-label="View the backdrop full size"
                >
                  <ImageWithFallback
                    src={form.backdropUrl}
                    alt="Current backdrop"
                    className="h-10 w-16 rounded object-cover ring-1 ring-slate-200 dark:ring-slate-600"
                  />
                </button>
              )}
              {!isNew && form.backdropUrl && (
                <PreviewButton kind="image" label="View full size" onClick={() => previewMovieField("Backdrop", "image", (m) => m?.backdrop_url)} />
              )}
            </div>

            <div>
              <label className={labelCls}>Trailer Video</label>
              <input
                type="file"
                accept="video/*"
                onChange={(e) => setTrailerFile(e.target.files?.[0] || null)}
                className={inputCls}
              />
              {!isNew && form.trailerUrl && (
                <>
                  <p className={hintCls}>✓ Trailer exists — leave empty to keep</p>
                  <PreviewButton
                    kind="video"
                    label="Play trailer"
                    onClick={() => previewMovieField("Trailer", "video", (m) => m?.trailer_url ?? m?.trailer_video?.file_url)}
                  />
                </>
              )}
            </div>

            <div>
              <label className={labelCls}>Main Video File</label>
              <input
                type="file"
                accept="video/*"
                onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                className={inputCls}
              />
              <p className={hintCls}>Leave empty to keep the existing video</p>
              {!isNew && <PreviewButton kind="video" label="Play uploaded video" onClick={previewMainVideo} />}
            </div>

            <div>
              <label className={labelCls}>Video Quality</label>
              <select
                value={form.videoQuality}
                onChange={(e) => set({ videoQuality: e.target.value })}
                className={inputCls}
              >
                {VIDEO_QUALITIES.map((q) => (
                  <option key={q} value={q}>
                    {q}
                  </option>
                ))}
              </select>
              <p className={hintCls}>Applies to the main video file being uploaded.</p>
            </div>
          </div>
        </section>

        {/* ── TVOD pricing ─────────────────────────────────────────────────
            Saved via /movies/:movieId/pricing, one row per quality tier.
            Not part of the movie record itself.                            */}
        <section className="space-y-3 border-t border-slate-200 pt-6 dark:border-slate-700">
          <h2 className={sectionCls}>Pay-per-view price</h2>
          <p className={hintCls}>
            One price per film, applied to every quality (480p, 720p, 1080p). Leave it empty
            if this film is not sold pay-per-view.
            {isNew && " The price is saved right after the movie is created."}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="number"
              min={0}
              step={0.01}
              placeholder="Price"
              disabled={pricing.isFree}
              value={pricing.isFree ? "" : pricing.price}
              onChange={(e) => setPricing((p) => ({ ...p, price: e.target.value }))}
              className={`${inputCls} w-40 disabled:opacity-40`}
              aria-label="Pay-per-view price"
            />
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={pricing.isFree}
                onChange={(e) => setPricing((p) => ({ ...p, isFree: e.target.checked }))}
                className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-slate-600 dark:text-slate-400">Free</span>
            </label>
          </div>
        </section>

        {isSaving && (
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

        <div className="flex gap-3 border-t border-slate-200 pt-6 dark:border-slate-700">
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-lg bg-primary-600 px-5 py-2.5 font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {isSaving ? uploadStatus || "Saving…" : isNew ? "Create" : "Save Changes"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/content/movies")}
            disabled={isSaving}
            className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

function updateCast(
  setForm: React.Dispatch<React.SetStateAction<FormState>>,
  idx: number,
  patch: Partial<{ name: string; role: string; character: string }>
) {
  setForm((f) => {
    const cast = [...f.cast];
    cast[idx] = { ...cast[idx], ...patch };
    return { ...f, cast };
  });
}

const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100";
const labelCls = "mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300";
const sectionCls =
  "text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400";
const hintCls = "mt-1 text-xs text-slate-500 dark:text-slate-400";

/** Surface the backend's actual message (Joi details included) rather than a generic string. */
function extractError(err: any, fallback: string): string {
  const data = err?.response?.data;
  const details = data?.error?.details;
  if (Array.isArray(details) && details.length > 0) {
    return details.map((d: any) => `${d.field}: ${d.message}`).join("; ");
  }
  return (
    data?.message ??
    data?.error?.message ??
    (typeof data === "string" ? data : null) ??
    err?.message ??
    fallback
  );
}
