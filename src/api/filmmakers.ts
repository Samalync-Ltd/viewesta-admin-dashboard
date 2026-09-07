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

/**
 * `/admin/users?user_type=filmmaker` rows are plain `users` rows (verified
 * live 2026-09-07: real data returned, e.g. 11 filmmakers). There is no
 * "follower" or "movie count" concept on this endpoint at all — those stay
 * at 0 rather than being invented; the list would need those fields added
 * server-side to show real numbers here.
 */
function normalizeFilmmaker(raw: any): Filmmaker {
  const name = [raw?.first_name, raw?.last_name].filter(Boolean).join(" ").trim();
  return {
    id: raw?.id,
    name: name || raw?.username || raw?.email,
    bio: raw?.bio ?? undefined,
    avatarUrl: raw?.avatar_url ?? undefined,
    followerCount: Number(raw?.follower_count ?? 0) || 0,
    movieCount: Number(raw?.movie_count ?? 0) || 0,
    enabled: raw?.is_active !== false,
    movieIds: [],
    createdAt: raw?.created_at ?? raw?.createdAt,
  };
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
    const page_ = toPaginatedList<any>(data, "users", page, limit);
    return { ...page_, data: page_.data.map(normalizeFilmmaker) };
  },
  /**
   * GET /admin/users/:id — verified live 2026-09-07: this now works (200),
   * contrary to the 404 recorded here on 2026-08-31 (the backend added this
   * route since then). Works for any user id regardless of user_type.
   */
  get: async (id: string): Promise<Filmmaker> => {
    if (useMock) {
      return mockDelay(150).then(() => mockDb.getFilmmaker(id) ?? Promise.reject(new Error("Not found")));
    }
    const { data } = await api.get(`/admin/users/${id}`);
    return normalizeFilmmaker(data?.data?.user ?? data?.user ?? data);
  },
  /**
   * NO BACKEND ROUTE for creating a filmmaker. `/filmmakers` (POST) 404s
   * live (2026-08-31) — filmmaker accounts are created via normal
   * registration (user_type: 'filmmaker'), there is no admin-side creation
   * endpoint. Left pointing at its original path rather than disguised as
   * fixed.
   */
  create: (body: Partial<Filmmaker>) =>
    useMock
      ? mockDelay(300).then(() => mockDb.createFilmmaker(body))
      : api.post<Filmmaker>("/filmmakers", body).then((r) => r.data),
  /**
   * Enabling/disabling a filmmaker is the same is_active flag as any other
   * user, so this reuses the real, verified-live (2026-09-07)
   * PATCH /admin/users/:id/status endpoint instead of the nonexistent
   * PATCH /filmmakers/:id. Only `enabled` is applied — bio/name edits still
   * have no backend route (see `create` above) and are silently dropped if
   * passed here.
   */
  update: async (id: string, body: Partial<Filmmaker>): Promise<void> => {
    if (useMock) {
      await mockDelay(200).then(() => mockDb.updateFilmmaker(id, body) ?? Promise.reject(new Error("Not found")));
      return;
    }
    if (typeof body.enabled === "boolean") {
      await api.patch(`/admin/users/${id}/status`, { is_active: body.enabled });
    }
  },
  /**
   * NO BACKEND ROUTE. `/filmmakers/:id` (DELETE) 404s live (2026-08-31);
   * there is no way to delete a user account from the admin API at all.
   * Left pointing at its original path rather than disguised as fixed.
   */
  delete: (id: string): Promise<void> =>
    useMock ? mockDelay(200).then(() => { mockDb.deleteFilmmaker(id); }) : api.delete(`/filmmakers/${id}`).then(() => undefined),
};
