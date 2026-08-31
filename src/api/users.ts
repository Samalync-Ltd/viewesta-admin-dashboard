import { api } from "./client";
import { useMock } from "../config/useMock";
import { mockDb, mockDelay } from "../data/mockDb";
import type { PaginatedResponse, ListParams } from "../types/api";
import { toListQuery, toPaginatedList } from "./listQuery";
import type { User } from "../types/models";

export const usersApi = {
  /**
   * GET /admin/users. `/users` does not exist (404, verified live 2026-08-31).
   *
   * Params go through toListQuery so the request sends limit+offset instead of
   * the unsupported `page`, and the `{data:{users,pagination}}` envelope is
   * unwrapped rather than handed back raw.
   */
  list: async (params?: ListParams): Promise<PaginatedResponse<User>> => {
    if (useMock) return mockDelay(250).then(() => mockDb.getUsers(params));
    const { query, page, limit } = toListQuery({ limit: 20, ...(params ?? {}) });
    const { data } = await api.get("/admin/users", { params: query });
    return toPaginatedList<User>(data, "users", page, limit);
  },
  /**
   * NO BACKEND ROUTE. Verified live 2026-08-31: `/users/:id` and
   * `/admin/users/:id` both 404, as do the block / unblock / grant-access
   * actions below. Only the LIST endpoint exists. These are left pointing at
   * their original paths rather than being "corrected" to an /admin/ prefix
   * that 404s just the same — moving them would only disguise a missing
   * backend route as a fixed one. They need new endpoints server-side.
   */
  get: (id: string) =>
    useMock
      ? mockDelay(150).then(() => mockDb.getUser(id) ?? Promise.reject(new Error("Not found")))
      : api.get<User>(`/users/${id}`).then((r) => r.data),
  block: (id: string): Promise<void> =>
    useMock ? mockDelay(200).then(() => { mockDb.blockUser(id); }) : api.post(`/users/${id}/block`).then(() => undefined),
  unblock: (id: string): Promise<void> =>
    useMock ? mockDelay(200).then(() => { mockDb.unblockUser(id); }) : api.post(`/users/${id}/unblock`).then(() => undefined),
  grantAccess: (id: string, payload?: Record<string, unknown>): Promise<void> =>
    useMock ? mockDelay(200).then(() => undefined) : api.post(`/users/${id}/grant-access`, payload).then(() => undefined),
};
