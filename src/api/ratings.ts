import { api } from "./client";
import { useMock } from "../config/useMock";
import { toListQuery, unwrapCollection } from "./listQuery";
import { mockDb, mockDelay } from "../data/mockDb";
import type { ListParams } from "../types/api";

export interface RatingSummary {
  id: string;
  movieId: string;
  movieTitle: string;
  averageRating: number;
  count: number;
  flaggedCount?: number;
}

/**
 * GET /ratings returns one row per individual rating (verified live
 * 2026-09-07: id, user_id, content_id, content_type, content_title, rating,
 * review_text, is_approved, helpful_count, created_at, average_rating,
 * rating_count) — not the { movieId, movieTitle, averageRating, count }
 * per-movie summary this page was written against. That mismatch (reading
 * r.movieId / r.averageRating.toFixed(1), all undefined on the real shape)
 * threw at render — averageRating.toFixed on undefined — so the page never
 * displayed rows even though the backend had real ratings. Each row already
 * carries the movie's aggregate average_rating/rating_count alongside the
 * individual review, so map those through directly.
 */
function normalizeRating(raw: any): RatingSummary {
  return {
    id: raw?.id,
    movieId: raw?.content_id,
    movieTitle: raw?.content_title,
    averageRating: Number(raw?.average_rating ?? raw?.rating ?? 0) || 0,
    count: Number(raw?.rating_count ?? 0) || 0,
    flaggedCount: undefined, // no "flagged" concept in the backend response
  };
}

export const ratingsApi = {
  list: (params?: ListParams) =>
    useMock
      ? mockDelay(200).then(() => mockDb.getRatings(params))
      : // limit+offset, never `page` (stripped server-side, so every request
        // returned the first page regardless of what the admin clicked).
        api
          .get("/ratings", { params: toListQuery({ limit: 20, ...(params ?? {}) }).query })
          .then((r) => {
            const body = (r.data as any)?.data ?? r.data;
            const items = unwrapCollection<any>(r.data, "ratings").map(normalizeRating);
            return { data: items, total: Number(body?.pagination?.total ?? items.length) || 0 };
          }),
  disableForContent: (movieId: string) =>
    api.post(`/ratings/movies/${movieId}/disable`),
  enableForContent: (movieId: string) =>
    api.post(`/ratings/movies/${movieId}/enable`),
  flagAbuse: (ratingId: string) => api.post(`/ratings/${ratingId}/flag`),
};
