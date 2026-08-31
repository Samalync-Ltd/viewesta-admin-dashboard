import { api } from "./client";
import { useMock } from "../config/useMock";
import { mockDb, mockDelay } from "../data/mockDb";
import type { PaginatedResponse, ListParams } from "../types/api";
import { toListQuery, toPaginatedList } from "./listQuery";
import type { Filmmaker } from "../types/models";

/**
 * A filmmaker as the real backend actually exposes one.
 *
 * NOTE: there is no `/filmmakers` resource. `filmmakerRoutes` is mounted at
 * `/filmmaker` (singular) and only exposes contract/payout/my-movies routes —
 * no list, create, update or delete. A live probe of `GET /api/v1/filmmakers`
 * returns 404, so every non-`listOptions` method below only works in mock mode.
 *
 * Filmmakers are users with `user_type = 'filmmaker'`
 * (users_user_type_check: 'viewer' | 'filmmaker' | 'admin'), so the real
 * listing is the admin user endpoint.
 */
export interface FilmmakerOption {
  id: string;
  email: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  is_active?: boolean;
}

/** Human label for a filmmaker row, falling back through the available names. */
export function filmmakerLabel(f: FilmmakerOption): string {
  const full = [f.first_name, f.last_name].filter(Boolean).join(" ").trim();
  return full || f.username || f.email;
}

export const filmmakersApi = {
  /**
   * GET /admin/users?user_type=filmmaker — admin-only, and the only filmmaker
   * listing that exists against the real backend. Used to populate selectors.
   */
  listOptions: async (search?: string): Promise<FilmmakerOption[]> => {
    const { data } = await api.get("/admin/users", {
      params: { user_type: "filmmaker", limit: 200, ...(search ? { search } : {}) },
    });
    const body = (data as any)?.data ?? data;
    return Array.isArray(body?.users) ? body.users : [];
  },

  /**
   * GET /admin/users?user_type=filmmaker. `/filmmakers` does not exist (404,
   * verified live 2026-08-31) — filmmakers are users with a role, not a
   * separate collection, so the rows come back under `users`.
   */
  list: async (params?: ListParams): Promise<PaginatedResponse<Filmmaker>> => {
    if (useMock) return mockDelay(250).then(() => mockDb.getFilmmakers(params));
    const { query, page, limit } = toListQuery({
      limit: 20,
      ...(params ?? {}),
      user_type: "filmmaker",
    });
    const { data } = await api.get("/admin/users", { params: query });
    return toPaginatedList<Filmmaker>(data, "users", page, limit);
  },
  /**
   * NO BACKEND ROUTE — same gap as usersApi: only the list exists. `/filmmakers`
   * and `/filmmakers/:id` 404, and there is no `/admin/users/:id` to move them
   * to (also 404, verified live 2026-08-31). Creating, editing or deleting a
   * filmmaker from the dashboard needs new endpoints server-side.
   */
  get: (id: string) =>
    useMock
      ? mockDelay(150).then(() => mockDb.getFilmmaker(id) ?? Promise.reject(new Error("Not found")))
      : api.get<Filmmaker>(`/filmmakers/${id}`).then((r) => r.data),
  create: (body: Partial<Filmmaker>) =>
    useMock
      ? mockDelay(300).then(() => mockDb.createFilmmaker(body))
      : api.post<Filmmaker>("/filmmakers", body).then((r) => r.data),
  update: (id: string, body: Partial<Filmmaker>) =>
    useMock
      ? mockDelay(200).then(() => mockDb.updateFilmmaker(id, body) ?? Promise.reject(new Error("Not found")))
      : api.patch<Filmmaker>(`/filmmakers/${id}`, body).then((r) => r.data),
  delete: (id: string): Promise<void> =>
    useMock ? mockDelay(200).then(() => { mockDb.deleteFilmmaker(id); }) : api.delete(`/filmmakers/${id}`).then(() => undefined),
};
