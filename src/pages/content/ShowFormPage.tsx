import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { CheckCircle, XCircle } from "lucide-react";
import { contentApi, type ContentMediaFiles } from "../../api/content";
import { toast } from "../../components/ui/Toast";
import { CONTENT_STATUSES, STATUS_LABELS } from "../../lib/contentStatus";
import { AGE_RATINGS } from "../../lib/contentOptions";
import type { Category } from "../../types/models";

/**
 * Edit an existing show — PUT /shows/:id.
 *
 * Writable set, verified against showValidation.update (Joi, stripUnknown) and
 * Series.update()'s column whitelist:
 *   title, description, age_rating, director_name, producer_name, cast,
 *   duration_minutes, category_id, release_year, status, content_type
 * plus poster/backdrop/thumbnail/trailer as multipart files.
 *
 * Deliberately NOT offered here:
 *   filmmaker_id — accepted by showValidation.create but absent from
 *                  showValidation.update and Series.update()'s whitelist.
 *   access_type  — real column, no writable path on any endpoint.
 */

interface ShowEditState {
  title: string;
  description: string;
  releaseYear: number;
  durationMinutes: number;
  status: string;
  ageRating: string;
  directorName: string;
  producerName: string;
  categoryId: string;
  cast: { name: string; role: string; character: string }[];
  posterUrl: string;
  backdropUrl: string;
  thumbnailUrl: string;
  trailerUrl: string;
  filmmakerName: string;
}

const emptyShow: ShowEditState = {
  title: "",
  description: "",
  releaseYear: new Date().getFullYear(),
  durationMinutes: 0,
  status: "approved",
  ageRating: "",
  directorName: "",
  producerName: "",
  categoryId: "",
  cast: [],
  posterUrl: "",
  backdropUrl: "",
  thumbnailUrl: "",
  trailerUrl: "",
  filmmakerName: "",
};

function normaliseShow(raw: any): ShowEditState {
  return {
    title: raw.title ?? "",
    description: raw.description ?? "",
    releaseYear: Number(raw.release_year) || new Date().getFullYear(),
    durationMinutes: Number(raw.duration ?? raw.duration_minutes ?? 0) || 0,
    status: raw.status ?? "approved",
    ageRating: raw.age_rating ?? "",
    directorName: raw.director_name ?? "",
    producerName: raw.producer_name ?? "",
    categoryId: raw.category_id ?? "",
    cast: Array.isArray(raw.cast)
      ? raw.cast.map((c: any) => ({
          name: c.name ?? c.actor_name ?? "",
          role: c.role ?? "",
          character: c.character ?? c.character_name ?? "",
        }))
      : [],
    posterUrl: raw.poster_url ?? "",
    backdropUrl: raw.backdrop_url ?? "",
    thumbnailUrl: raw.thumbnail_url ?? "",
    trailerUrl: raw.trailer_url ?? "",
    filmmakerName:
      [raw.filmmaker_first_name, raw.filmmaker_last_name].filter(Boolean).join(" ").trim() ||
      raw.creator_name ||
      raw.filmmaker_email ||
      "",
  };
}

export function ShowFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<ShowEditState>(emptyShow);
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [backdropFile, setBackdropFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [trailerFile, setTrailerFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const { data: categories } = useQuery({
    queryKey: ["content", "categories"],
    queryFn: contentApi.categories.list,
    staleTime: 5 * 60 * 1000,
  });

  const { data: rawShow, isLoading, isError, error } = useQuery({
    queryKey: ["content", "shows", id],
    queryFn: () => contentApi.shows.get(id!),
    enabled: Boolean(id),
    staleTime: 0,
  });

  useEffect(() => {
    if (rawShow) setForm(normaliseShow(rawShow));
  }, [rawShow]);

  const set = (patch: Partial<ShowEditState>) => setForm((f) => ({ ...f, ...patch }));

  // ── Approval review state ───────────────────────────────────────
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  /**
   * Series moderation, mirroring MovieFormPage. `POST /shows/admin/:id/approve`
   * and `/reject` are the routes the backend actually mounts for this — see the
   * note on `contentApi.shows.approve`. Until these existed there was no series
   * approval path anywhere in the product; the Status dropdown below writes the
   * column through `PUT /shows/:id` but does NOT run moderation, so it never
   * notified the filmmaker. These buttons are the only path that does.
   */
  const approveMutation = useMutation({
    mutationFn: () => contentApi.shows.approve(id!),
    onSuccess: () => {
      toast("Series approved — the filmmaker has been notified.", "success");
      queryClient.invalidateQueries({ queryKey: ["content", "shows"] });
      navigate("/content/shows");
    },
    onError: (err: any) => toast(extractError(err, "Approval failed"), "error"),
  });

  const rejectMutation = useMutation({
    mutationFn: (reason: string) => contentApi.shows.reject(id!, reason),
    onSuccess: () => {
      toast("Series rejected — the filmmaker has been notified.", "success");
      setIsRejectOpen(false);
      setRejectReason("");
      queryClient.invalidateQueries({ queryKey: ["content", "shows"] });
      navigate("/content/shows");
    },
    onError: (err: any) => toast(extractError(err, "Rejection failed"), "error"),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    if (form.title.trim().length < 2) {
      toast("Title must be at least 2 characters.", "error");
      return;
    }

    const cast = form.cast
      .filter((c) => c.name.trim() && c.role.trim())
      .map((c) => ({ name: c.name.trim(), role: c.role.trim(), character: c.character.trim() }));

    const fields: Record<string, unknown> = {
      title: form.title.trim(),
      status: form.status,
    };
    if (form.description.trim()) fields.description = form.description.trim();
    if (form.directorName.trim()) fields.director_name = form.directorName.trim();
    if (form.producerName.trim()) fields.producer_name = form.producerName.trim();
    if (AGE_RATINGS.includes(form.ageRating as any)) fields.age_rating = form.ageRating;
    if (form.categoryId) fields.category_id = form.categoryId;
    if (form.durationMinutes > 0) fields.duration_minutes = form.durationMinutes;
    if (form.releaseYear >= 1888 && form.releaseYear <= 2100) fields.release_year = form.releaseYear;
    // Joi requires a non-empty array when `cast` is present.
    if (cast.length > 0) fields.cast = cast;

    const files: ContentMediaFiles = {
      poster: posterFile,
      backdrop: backdropFile,
      thumbnail: thumbnailFile,
      trailer: trailerFile,
    };

    try {
      setIsSaving(true);
      const updated = await contentApi.shows.update(id, fields, files);
      if (updated?.id) setForm(normaliseShow(updated));
      await queryClient.invalidateQueries({ queryKey: ["content", "shows"] });
      toast("Show updated successfully", "success");
      navigate("/content/shows");
    } catch (err: any) {
      toast(extractError(err, "Save failed"), "error");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
        <p className="text-sm text-slate-500 dark:text-slate-400">Loading show data...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-3xl rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-red-200">
        <h1 className="text-lg font-semibold">Could not load this show</h1>
        <p className="mt-2 text-sm">
          {(error as any)?.response?.data?.message ?? (error as Error)?.message}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Edit Show: {form.title || "…"}
        </h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">
          Seasons and episodes are managed separately from this screen.
        </p>
      </div>

      {/* ── Pending Review Banner ───────────────────────────────────────── */}
      {form.status === "pending" && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-5 dark:border-amber-600 dark:bg-amber-900/20">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="font-semibold text-amber-900 dark:text-amber-300">
                ⏳ Pending Review
              </h2>
              <p className="mt-1 text-sm text-amber-800 dark:text-amber-400">
                This series was submitted by the filmmaker and is waiting for your decision.
                Approving will publish it on the platform and notify the filmmaker immediately.
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
              <button
                type="button"
                disabled={approveMutation.isPending || rejectMutation.isPending}
                onClick={() => approveMutation.mutate()}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                <CheckCircle className="h-4 w-4" />
                {approveMutation.isPending ? "Approving…" : "Approve"}
              </button>
              <button
                type="button"
                disabled={approveMutation.isPending || rejectMutation.isPending}
                onClick={() => setIsRejectOpen((o) => !o)}
                className="inline-flex items-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-700 dark:bg-slate-800 dark:text-red-400"
              >
                <XCircle className="h-4 w-4" />
                Reject
              </button>
            </div>
          </div>

          {/* Reject reason input — shown inline when Reject is clicked */}
          {isRejectOpen && (
            <div className="mt-4 space-y-3 border-t border-amber-200 pt-4 dark:border-amber-700">
              <label className="block text-sm font-medium text-amber-900 dark:text-amber-300">
                Rejection reason <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Explain why this content is being rejected…"
                className="w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm dark:border-amber-700 dark:bg-slate-800 dark:text-slate-100"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={!rejectReason.trim() || rejectMutation.isPending}
                  onClick={() => rejectMutation.mutate(rejectReason.trim())}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {rejectMutation.isPending ? "Rejecting…" : "Confirm Rejection"}
                </button>
                <button
                  type="button"
                  onClick={() => { setIsRejectOpen(false); setRejectReason(""); }}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
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
              <label className={labelCls}>Description</label>
              <textarea
                rows={4}
                maxLength={1000}
                value={form.description}
                onChange={(e) => set({ description: e.target.value })}
                className={inputCls}
              />
              <p className={hintCls}>{form.description.length}/1000</p>
            </div>

            <div>
              <label className={labelCls}>Release Year</label>
              <input
                type="number"
                min={1888}
                max={2100}
                value={form.releaseYear}
                onChange={(e) =>
                  set({ releaseYear: Number(e.target.value) || new Date().getFullYear() })
                }
                className={inputCls}
              />
            </div>

            <div>
              <label className={labelCls}>Average Episode Duration (min)</label>
              <input
                type="number"
                min={0}
                value={form.durationMinutes}
                onChange={(e) => set({ durationMinutes: Number(e.target.value) || 0 })}
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
              <p className={hintCls}>Only Approved content is visible to end users.</p>
            </div>

            <div>
              <label className={labelCls}>Filmmaker</label>
              <p className="rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-600 dark:border-slate-600 dark:text-slate-400">
                {form.filmmakerName || "Unassigned"}
              </p>
              <p className={hintCls}>
                Read-only: filmmaker can only be set when the show is created.
              </p>
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
          </div>
        </section>

        <section className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <h2 className={sectionCls}>Cast</h2>
            <button
              type="button"
              onClick={() => set({ cast: [...form.cast, { name: "", role: "", character: "" }] })}
              className="text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400"
            >
              + Add Member
            </button>
          </div>
          {form.cast.length === 0 ? (
            <p className="text-sm italic text-slate-500 dark:text-slate-400">
              No cast members. Leave empty to keep what is already stored.
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
                  onClick={() => setForm((f) => ({ ...f, cast: f.cast.filter((_, i) => i !== idx) }))}
                  className="text-sm font-medium text-red-500 hover:text-red-700"
                >
                  Remove
                </button>
              </div>
            ))
          )}
        </section>

        <section className="space-y-4 border-t border-slate-200 pt-6 dark:border-slate-700">
          <h2 className={sectionCls}>Media</h2>
          <p className={hintCls}>Leave a field empty to keep the stored file.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <MediaField
              label="Poster"
              current={form.posterUrl}
              accept="image/*"
              onPick={setPosterFile}
            />
            <MediaField
              label="Backdrop"
              current={form.backdropUrl}
              accept="image/*"
              onPick={setBackdropFile}
            />
            <MediaField
              label="Thumbnail"
              current={form.thumbnailUrl}
              accept="image/*"
              onPick={setThumbnailFile}
            />
            <MediaField
              label="Trailer"
              current={form.trailerUrl}
              accept="video/*"
              onPick={setTrailerFile}
              preview={false}
            />
          </div>
        </section>

        <div className="flex gap-3 border-t border-slate-200 pt-6 dark:border-slate-700">
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-lg bg-primary-600 px-5 py-2.5 font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {isSaving ? "Saving…" : "Save Changes"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/content/shows")}
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

function MediaField({
  label,
  current,
  accept,
  onPick,
  preview = true,
}: {
  label: string;
  current: string;
  accept: string;
  onPick: (f: File | null) => void;
  preview?: boolean;
}) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <input
        type="file"
        accept={accept}
        onChange={(e) => onPick(e.target.files?.[0] || null)}
        className={inputCls}
      />
      {current && preview && (
        <img
          src={current}
          alt={`Current ${label.toLowerCase()}`}
          className="mt-2 h-16 w-auto rounded object-cover ring-1 ring-slate-200 dark:ring-slate-600"
        />
      )}
      {current && !preview && <p className={hintCls}>✓ Stored — leave empty to keep</p>}
    </div>
  );
}

function updateCast(
  setForm: React.Dispatch<React.SetStateAction<ShowEditState>>,
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

function extractError(err: any, fallback: string): string {
  const data = err?.response?.data;
  const details = data?.error?.details;
  if (Array.isArray(details) && details.length > 0) {
    return details.map((d: any) => `${d.field}: ${d.message}`).join("; ");
  }
  return data?.message ?? data?.error?.message ?? err?.message ?? fallback;
}
