import { api } from "./client";
import { useMock } from "../config/useMock";
import { mockDb, mockDelay } from "../data/mockDb";
import type { PaginatedResponse, ListParams } from "../types/api";
import type { Movie, Genre, Category } from "../types/models";

export const contentApi = {
  movies: {
    list: (params?: ListParams) =>
      useMock
        ? mockDelay(250).then(() => mockDb.getMovies(params))
        : api.get<PaginatedResponse<Movie>>("/content/movies", { params }).then((r) => r.data),
    get: (id: string) =>
      useMock
        ? mockDelay(150).then(() => mockDb.getMovie(id) ?? Promise.reject(new Error("Not found")))
        : api.get<Movie>(`/content/movies/${id}`).then((r) => r.data),
    create: (body: Partial<Movie>) =>
      useMock
        ? mockDelay(300).then(() => mockDb.createMovie(body))
        : api.post<Movie>("/content/movies", body).then((r) => r.data),
    update: (id: string, body: Partial<Movie>) =>
      useMock
        ? mockDelay(200).then(() => mockDb.updateMovie(id, body) ?? Promise.reject(new Error("Not found")))
        : api.patch<Movie>(`/content/movies/${id}`, body).then((r) => r.data),
    delete: (id: string): Promise<void> =>
      useMock ? mockDelay(200).then(() => { mockDb.deleteMovie(id); }) : api.delete(`/content/movies/${id}`).then(() => undefined),
  },
  genres: {
    list: () =>
      useMock ? mockDelay(150).then(() => mockDb.getGenres()) : api.get<Genre[]>("/content/genres").then((r) => r.data),
    create: (body: { name: string; slug?: string }) =>
      useMock
        ? mockDelay(200).then(() => mockDb.createGenre(body))
        : api.post<Genre>("/content/genres", body).then((r) => r.data),
    update: (id: string, body: Partial<Genre>) =>
      useMock
        ? mockDelay(150).then(() => mockDb.updateGenre(id, body) ?? Promise.reject(new Error("Not found")))
        : api.patch<Genre>(`/content/genres/${id}`, body).then((r) => r.data),
    delete: (id: string): Promise<void> =>
      useMock ? mockDelay(150).then(() => { mockDb.deleteGenre(id); }) : api.delete(`/content/genres/${id}`).then(() => undefined),
  },
  categories: {
    list: () =>
      useMock
        ? mockDelay(150).then(() => mockDb.getCategories())
        : api.get<Category[]>("/content/categories").then((r) => r.data),
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
        : api.post<Category>("/content/categories", body).then((r) => r.data),
    update: (id: string, body: Partial<Category>) =>
      useMock
        ? mockDelay(150).then(() => mockDb.updateCategory(id, body) ?? Promise.reject(new Error("Not found")))
        : api.patch<Category>(`/content/categories/${id}`, body).then((r) => r.data),
    delete: (id: string): Promise<void> =>
      useMock
        ? mockDelay(150).then(() => {
            mockDb.categories = mockDb.categories.filter((c) => c.id !== id);
          })
        : api.delete(`/content/categories/${id}`).then(() => undefined),
  },
};
