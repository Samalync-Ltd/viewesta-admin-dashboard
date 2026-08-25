import { api } from "./client";
import { useMock } from "../config/useMock";
import { mockDb, mockDelay } from "../data/mockDb";
import type { PaginatedResponse, ListParams } from "../types/api";
import type { Movie, Category } from "../types/models";

/** Unwrap the common backend envelopes:
 *  { data: { movie: {...} } }
 *  { data: { data: {...} } }
 *  { data: {...} }
 *  { movie: {...} }
 *  raw object (already the movie)
 */
function unwrapMovie(raw: any): any {
  return (
    raw?.data?.movie ??
    raw?.data?.data ??
    raw?.data ??
    raw?.movie ??
    raw
  );
}

function unwrapSeries(raw: any): any {
  return raw?.data?.series ?? raw?.data?.show ?? raw?.data ?? raw;
}

function extractMovieListPayload(payload: any): any[] {
  if (!payload) return [];

  const responseData = payload?.data ?? payload;
  if (Array.isArray(responseData)) return responseData;

  if (Array.isArray(responseData?.movies)) return responseData.movies;
  if (Array.isArray(responseData?.items)) return responseData.items;
  if (Array.isArray(responseData?.data)) return responseData.data;
  if (Array.isArray(responseData?.data?.movies)) return responseData.data.movies;
  if (Array.isArray(responseData?.data?.items)) return responseData.data.items;

  return [];
}

export const contentApi = {
  movies: {
    list: async (params?: ListParams) => {
      const rawParams = { ...(params ?? {}) } as Record<string, string | number | undefined>;
      const limit = Number(rawParams.limit ?? 100) || 100;
      const page = Number(rawParams.page ?? 1) || 1;
      const offset = Number(rawParams.offset ?? (page - 1) * limit) || 0;

      delete rawParams.page;
      delete rawParams.offset;

      const queryParams = {
        ...rawParams,
        limit,
        offset,
      } as Record<string, string | number>;

      if (typeof rawParams.status !== "undefined") {
        const { data } = await api.get<PaginatedResponse<Movie>>("/movies", { params: queryParams });
        return data;
      }

      const [approvedResponse, pendingResponse] = await Promise.all([
        api.get<PaginatedResponse<Movie>>("/movies", { params: { ...queryParams, status: "approved" } }).catch(() => ({ data: {} })),
        api.get<PaginatedResponse<Movie>>("/movies", { params: { ...queryParams, status: "pending" } }).catch(() => ({ data: {} })),
      ]);

      const merged = [
        ...extractMovieListPayload(approvedResponse.data),
        ...extractMovieListPayload(pendingResponse.data),
      ];

      const uniqueMovies = Array.from(new Map(merged.map((item) => [item.id, item])).values());

      return {
        data: uniqueMovies,
        total: uniqueMovies.length,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(uniqueMovies.length / limit)),
      } satisfies PaginatedResponse<Movie>;
    },
    get: (id: string) =>
      api.get(`/movies/${id}`).then((r) => unwrapMovie(r.data)),
    create: (body: Partial<Movie> | FormData) =>
      api.post("/movies", body).then((r) => r.data),
    update: (id: string, body: Partial<Movie> | FormData) =>
      api.put(`/movies/${id}`, body).then((r) => r.data),
    delete: (id: string): Promise<void> =>
      api.delete(`/movies/${id}`).then(() => undefined),
    addVideoFile: (id: string, payload: FormData, onUploadProgress?: (progressEvent: any) => void) =>
      api.post(`/movies/${id}/video-files`, payload, { onUploadProgress }).then((r) => r.data),
  },
  series: {
    create: (body: any) =>
      api.post("/series", body).then((r) => unwrapSeries(r.data)),
    update: (id: string, body: any) =>
      api.put(`/series/${id}`, body).then((r) => unwrapSeries(r.data)),
    addEpisodeVideo: (
      seriesId: string,
      seasonNumber: number,
      episodeNumber: number,
      payload: FormData,
      onUploadProgress?: (progressEvent: any) => void
    ) =>
      api
        .post(
          `/series/${seriesId}/seasons/${seasonNumber}/episodes/${episodeNumber}/video`,
          payload,
          { onUploadProgress }
        )
        .then((r) => r.data),
  },
  genres: {
    list: () =>
      Promise.reject(new Error("Genres are no longer part of the current backend contract and have been disabled in the admin dashboard.")),
    create: () =>
      Promise.reject(new Error("Genres are no longer part of the current backend contract and have been disabled in the admin dashboard.")),
    update: () =>
      Promise.reject(new Error("Genres are no longer part of the current backend contract and have been disabled in the admin dashboard.")),
    delete: () =>
      Promise.reject(new Error("Genres are no longer part of the current backend contract and have been disabled in the admin dashboard.")),
  },
  categories: {
    list: () =>
      useMock
        ? mockDelay(150).then(() => mockDb.getCategories())
        : api.get<Category[]>("/categories").then((r) => r.data),
    create: (body: Partial<Category>) =>
      useMock
        ? mockDelay(200).then(() => {
            const id = `c${Date.now()}`;
            const cat: Category = {
              id,
              name: body.name ?? "",
              slug: (body.name ?? "").toLowerCase().replace(/\s+/g, "-"),
              featured: body.featured ?? false,
              movieIds: body.movieIds ?? [],
            };
            mockDb.categories.push(cat);
            return cat;
          })
        : api.post<Category>("/categories", body).then((r) => r.data),
    update: (id: string, body: Partial<Category>) =>
      useMock
        ? mockDelay(150).then(() => mockDb.updateCategory(id, body) ?? Promise.reject(new Error("Not found")))
        : api.patch<Category>(`/categories/${id}`, body).then((r) => r.data),
    delete: (id: string): Promise<void> =>
      useMock
        ? mockDelay(150).then(() => {
            mockDb.categories = mockDb.categories.filter((c) => c.id !== id);
          })
        : api.delete(`/categories/${id}`).then(() => undefined),
  },
};
