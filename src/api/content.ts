import { api } from "./client";
import type { PaginatedResponse, ListParams } from "../types/api";
import type { Movie, Category } from "../types/models";

/**
 * ── Backend contract notes (verified against viewesta-backend @ HEAD) ────────
 *
 * The metadata endpoints for movies and shows REJECT URL-shaped media fields:
 *
 *   movieRoutes.js  POST/PUT /movies      rejectLegacyMediaFields([
 *                                           'poster_url','backdrop_url',
 *                                           'trailer_url','trailer_video'])
 *   seriesRouter.js POST/PUT /series|shows rejectLegacyMediaFields([
 *                                           'poster_url','backdrop_url',
 *                                           'thumbnail_url','trailer_url',
 *                                           'trailer_video'])
 *
 * `rejectLegacyMediaFields` fires on `!== undefined`, so even an empty string
 * is a hard 400. Media MUST be sent as multipart/form-data files, which
 * attachMovieMediaUploads / attachShowMediaUploads then push to S3 and turn
 * into *_url values server-side. Omitting a file leaves the stored URL intact,
 * which is exactly the "leave empty to keep" behaviour the edit form wants.
 *
 * Everything else goes through Joi with `stripUnknown: true`, so unknown fields
 * are silently dropped — which is why sending fields the backend has never
 * heard of (price, included_in_subscription, video_quality, genres, …) used to
 * look like a successful save that changed nothing.
 */

/** One row of `movie_pricing`. */
export interface MoviePricingEntry {
  id?: string;
  movie_id?: string;
  quality: string;
  price: string | number;
  is_free: boolean;
}

/** Multipart field names the backend's media middleware looks for. */
export interface ContentMediaFiles {
  poster?: File | null;
  backdrop?: File | null;
  trailer?: File | null;
  thumbnail?: File | null;
}

/**
 * Build a multipart body. Scalars are stringified, arrays/objects are JSON
 * encoded (the backend JSON-parses `cast` and `trailer_video`), and
 * undefined/null/"" are omitted so we never blank a stored value by accident.
 */
export function buildContentFormData(
  fields: Record<string, unknown>,
  files: ContentMediaFiles = {}
): FormData {
  const fd = new FormData();

  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value) || typeof value === "object") {
      fd.append(key, JSON.stringify(value));
    } else {
      fd.append(key, String(value));
    }
  }

  for (const [key, file] of Object.entries(files)) {
    if (file) fd.append(key, file);
  }

  return fd;
}

/** Unwrap `{ success, data: { movie } }` and the older shapes. */
function unwrapMovie(raw: any): any {
  return raw?.data?.movie ?? raw?.data?.data ?? raw?.data ?? raw?.movie ?? raw;
}

/** Unwrap `{ success, data: { show } }`. */
function unwrapShow(raw: any): any {
  return raw?.data?.show ?? raw?.data?.series ?? raw?.data ?? raw?.show ?? raw;
}

/**
 * Normalise a list response into PaginatedResponse.
 * Backend shape: `{ success, data: { movies|shows, pagination:{total,limit,offset,pages} } }`
 */
function toPaginated<T>(payload: any, key: "movies" | "shows", page: number, limit: number): PaginatedResponse<T> {
  const body = payload?.data ?? payload;
  const items: T[] = Array.isArray(body?.[key])
    ? body[key]
    : Array.isArray(body?.items)
      ? body.items
      : Array.isArray(body?.data)
        ? body.data
        : Array.isArray(body)
          ? body
          : [];

  const pagination = body?.pagination ?? {};
  const total = Number(pagination.total ?? items.length) || 0;
  const effectiveLimit = Number(pagination.limit ?? limit) || limit;

  return {
    data: items,
    total,
    page,
    limit: effectiveLimit,
    totalPages: Number(pagination.pages) || Math.max(1, Math.ceil(total / effectiveLimit)),
  };
}

/**
 * Translate ListParams into the backend's pagination contract.
 * Defaults to newest-first, which is what both list screens want.
 */
function toQuery(params?: ListParams) {
  const raw = { ...(params ?? {}) } as Record<string, unknown>;
  const limit = Number(raw.limit ?? 20) || 20;
  const page = Number(raw.page ?? 1) || 1;
  const offset = Number(raw.offset ?? (page - 1) * limit) || 0;

  delete raw.page;
  delete raw.offset;
  delete raw.limit;

  const query: Record<string, string | number> = {
    limit,
    offset,
    sort_by: (raw.sort_by as string) ?? "created_at",
    order: (raw.order as string)?.toUpperCase() === "ASC" ? "ASC" : "DESC",
  };
  delete raw.sort_by;
  delete raw.order;
  delete raw.sort;

  for (const [key, value] of Object.entries(raw)) {
    if (value === undefined || value === null || value === "") continue;
    query[key] = value as string | number;
  }

  return { query, page, limit };
}

export const contentApi = {
  movies: {
    /**
     * GET /movies. Omitting `status` returns EVERY status for an admin token
     * (movieController.getMovies only forces 'approved' for non-admins), so
     * drafts stay visible instead of being filtered out client-side.
     */
    list: async (params?: ListParams) => {
      const { query, page, limit } = toQuery({ limit: 20, ...(params ?? {}) });
      const { data } = await api.get("/movies", { params: query });
      return toPaginated<Movie>(data, "movies", page, limit);
    },
    get: (id: string) => api.get(`/movies/${id}`).then((r) => unwrapMovie(r.data)),
    create: (fields: Record<string, unknown>, files?: ContentMediaFiles) =>
      api.post("/movies", buildContentFormData(fields, files)).then((r) => unwrapMovie(r.data)),
    update: (id: string, fields: Record<string, unknown>, files?: ContentMediaFiles) =>
      api.put(`/movies/${id}`, buildContentFormData(fields, files)).then((r) => unwrapMovie(r.data)),
    delete: (id: string): Promise<void> => api.delete(`/movies/${id}`).then(() => undefined),
    /**
     * Approve a pending movie — sets status to 'approved'.
     * The backend fires a `content_approved` FCM push to the filmmaker.
     *
     * NOT `PATCH /movies/:id` — that route does not exist on the backend
     * (confirmed live: a real PATCH to it returns 404, verified against
     * production on 2026-08-26). `POST /movies/admin/:id/approve` is the
     * actual route — it maps to `approveMovie` -> `applyMovieModeration`,
     * which is the only code path that calls `notifyContentApproved`. The
     * body is irrelevant here: the controller forces status via a fixed
     * argument rather than reading `req.body.status`, so `notes`/
     * `admin_notes` was never read by the backend either way — dropped
     * rather than sent somewhere it's silently ignored.
     */
    approve: (id: string): Promise<void> =>
      api.post(`/movies/admin/${id}/approve`).then(() => undefined),
    /**
     * Reject a pending movie — sets status to 'rejected'.
     * The backend fires a `content_rejected` FCM push to the filmmaker.
     *
     * NOT `PATCH /movies/:id` — same 404 as approve (re-confirmed live
     * 2026-08-27). The real route is `POST /movies/admin/:id/reject`.
     *
     * CAVEAT on `reason`: it is sent because that is the only field name the
     * route could plausibly read, but it is NOT confirmed to be persisted.
     * In the backend source `rejectMovie` -> `applyMovieModeration` passes a
     * hard-coded `'rejected'` and never touches `req.body` at all, so on that
     * code path the reason is dropped. Production is known to be AHEAD of that
     * source (prod returns an "Invalid ID format" error that does not exist in
     * it), so prod may well read `reason` — but nobody has proven it does.
     * Treat the rejection reason as best-effort until a live check with an
     * admin token shows it stored on the movie.
     */
    reject: (id: string, reason: string): Promise<void> =>
      api.post(`/movies/admin/${id}/reject`, { reason }).then(() => undefined),
    /** POST /movies/:id/video-files — multipart, field name must be `video`. */
    addVideoFile: (id: string, payload: FormData, onUploadProgress?: (e: any) => void) =>
      api.post(`/movies/${id}/video-files`, payload, { onUploadProgress }).then((r) => r.data),
  },

  /**
   * Shows (the backend still names the router "series"; `/shows` and `/series`
   * are the same router, so we use the `/shows` spelling throughout).
   */
  shows: {
    list: async (params?: ListParams) => {
      const { query, page, limit } = toQuery({ limit: 20, ...(params ?? {}) });
      const { data } = await api.get("/shows", { params: query });
      return toPaginated<any>(data, "shows", page, limit);
    },
    get: (id: string) => api.get(`/shows/${id}`).then((r) => unwrapShow(r.data)),
    create: (fields: Record<string, unknown>, files?: ContentMediaFiles) =>
      api.post("/shows", buildContentFormData(fields, files)).then((r) => unwrapShow(r.data)),
    update: (id: string, fields: Record<string, unknown>, files?: ContentMediaFiles) =>
      api.put(`/shows/${id}`, buildContentFormData(fields, files)).then((r) => unwrapShow(r.data)),
    delete: (id: string): Promise<void> => api.delete(`/shows/${id}`).then(() => undefined),

    /**
     * Approve a pending series — mirrors `movies.approve`.
     *
     * `POST /shows/admin/:id/approve`, verified live against production on
     * 2026-08-27: 401 unauthenticated on a well-formed UUID (route exists,
     * auth-gated), against a 404 on the `/series/admin/:id/approve` spelling
     * — so the router really does distinguish these, and the 401 is not a
     * catch-all. This route did NOT exist when series moderation was last
     * looked at; it does now, which is why the dashboard finally has a
     * series approve path at all.
     *
     * `/shows` and `/series` are the same router elsewhere in this file, but
     * NOT here — only the `/shows` spelling is mounted for admin moderation.
     */
    approve: (id: string): Promise<void> =>
      api.post(`/shows/admin/${id}/approve`).then(() => undefined),
    /**
     * Reject a pending series — mirrors `movies.reject`, including the same
     * unproven-`reason` caveat documented there: the field is sent because it
     * is the only plausible name, but it is not confirmed to be persisted.
     */
    reject: (id: string, reason: string): Promise<void> =>
      api.post(`/shows/admin/${id}/reject`, { reason }).then(() => undefined),

    /** POST /shows/:showId/seasons */
    createSeason: (showId: string, body: { season_number: number; title?: string; description?: string; release_year?: number }) =>
      api.post(`/shows/${showId}/seasons`, body).then((r) => r.data?.data?.season ?? r.data?.data ?? r.data),

    /** POST /seasons/:seasonId/episodes */
    createEpisode: (
      seasonId: string,
      body: { episode_number: number; title: string; description?: string; duration_minutes?: number }
    ) => api.post(`/seasons/${seasonId}/episodes`, body).then((r) => r.data?.data?.episode ?? r.data?.data ?? r.data),

    /** POST /episodes/:episodeId/video-files — multipart, field name must be `video`. */
    addEpisodeVideo: (episodeId: string, payload: FormData, onUploadProgress?: (e: any) => void) =>
      api.post(`/episodes/${episodeId}/video-files`, payload, { onUploadProgress }).then((r) => r.data),
  },

  /**
   * TVOD pricing lives in its own table (`movie_pricing`), keyed by
   * (movie_id, quality) — it is NOT a column on `movies`, so it can never be
   * saved through the movie update endpoint.
   *
   *   GET    /movies/:movieId/pricing            -> { movie_id, pricing: [...] }
   *   POST   /movies/:movieId/pricing            -> upsert one quality
   *   DELETE /movies/:movieId/pricing/:quality   -> drop one quality
   *
   * POST maps to `MoviePricing.setPricing`, which is
   * `INSERT ... ON CONFLICT (movie_id, quality) DO UPDATE`, so it doubles as
   * the update path — no need to branch on whether a row already exists.
   */
  pricing: {
    list: (movieId: string): Promise<MoviePricingEntry[]> =>
      api.get(`/movies/${movieId}/pricing`).then((r) => {
        const body = (r.data as any)?.data ?? r.data;
        return Array.isArray(body?.pricing) ? body.pricing : [];
      }),
    /** Upsert the price for one quality tier. */
    set: (movieId: string, body: { quality: string; price?: number; is_free?: boolean }) =>
      api.post(`/movies/${movieId}/pricing`, body).then((r) => r.data),
    remove: (movieId: string, quality: string): Promise<void> =>
      api.delete(`/movies/${movieId}/pricing/${quality}`).then(() => undefined),
  },

  categories: {
    /** GET /categories -> `{ success, data: { categories: [...] } }` */
    list: (): Promise<Category[]> =>
      api.get("/categories").then((r) => {
        const body = (r.data as any)?.data ?? r.data;
        const list = Array.isArray(body?.categories) ? body.categories : Array.isArray(body) ? body : [];
        return list as Category[];
      }),
    create: (body: Partial<Category>) =>
      api.post<Category>("/categories", body).then((r) => r.data),
    update: (id: string, body: Partial<Category>) =>
      api.put<Category>(`/categories/${id}`, body).then((r) => r.data),
    delete: (id: string): Promise<void> => api.delete(`/categories/${id}`).then(() => undefined),
  },
};
