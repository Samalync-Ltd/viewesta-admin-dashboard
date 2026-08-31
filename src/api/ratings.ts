import { api } from "./client";
import { useMock } from "../config/useMock";
import { toListQuery, unwrapCollection } from "./listQuery";
import { mockDb, mockDelay } from "../data/mockDb";
import type { ListParams } from "../types/api";

export interface RatingSummary {
  movieId: string;
  movieTitle: string;
  averageRating: number;
  count: number;
  flaggedCount?: number;
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
            const items = unwrapCollection<RatingSummary>(r.data, "ratings");
            return { data: items, total: Number(body?.pagination?.total ?? items.length) || 0 };
          }),
  disableForContent: (movieId: string) =>
    api.post(`/ratings/movies/${movieId}/disable`),
  enableForContent: (movieId: string) =>
    api.post(`/ratings/movies/${movieId}/enable`),
  flagAbuse: (ratingId: string) => api.post(`/ratings/${ratingId}/flag`),
};
