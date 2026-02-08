import { api } from "./client";
import { useMock } from "../config/useMock";
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
      : api.get<{ data: RatingSummary[]; total: number }>("/ratings", { params }).then((r) => r.data),
  disableForContent: (movieId: string) =>
    api.post(`/ratings/movies/${movieId}/disable`),
  enableForContent: (movieId: string) =>
    api.post(`/ratings/movies/${movieId}/enable`),
  flagAbuse: (ratingId: string) => api.post(`/ratings/${ratingId}/flag`),
};
