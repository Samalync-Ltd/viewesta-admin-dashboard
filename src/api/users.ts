import { api } from "./client";
import { useMock } from "../config/useMock";
import { mockDb, mockDelay } from "../data/mockDb";
import type { PaginatedResponse, ListParams } from "../types/api";
import { toListQuery, toPaginatedList } from "./listQuery";
import type { User } from "../types/models";

/**
 * The real `/admin/users` (list) and `/admin/users/:id` (detail) rows are
 * shaped like the `users` table — snake_case, `is_active`, `wallet_balance`
 * as a string, no `blocked`/`walletBalance`/`name` fields at all. Map them
 * onto the `User` type the UI actually reads instead of handing back the raw
 * row (verified live 2026-09-07 against both endpoints).
 */
function normalizeUser(raw: any): User {
  const name = [raw?.first_name, raw?.last_name].filter(Boolean).join(" ").trim();
  return {
    id: raw?.id,
    email: raw?.email,
    phone: raw?.phone ?? undefined,
    name: name || raw?.username || undefined,
    // The list/detail endpoints don't return a subscription status field —
    // there's nothing here to map it from, so this stays unset rather than
    // guessed at.
    subscriptionStatus: raw?.subscriptionStatus,
    walletBalance: Number(raw?.wallet_balance ?? 0) || 0,
    blocked: raw?.is_active === false,
    createdAt: raw?.created_at ?? raw?.createdAt,
  };
}

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
    const page_ = toPaginatedList<any>(data, "users", page, limit);
    return { ...page_, data: page_.data.map(normalizeUser) };
  },
  /**
   * GET /admin/users/:id — verified live 2026-09-07: this now works (200,
   * full user detail incl. movie_count / completed_payments /
   * active_subscriptions / active_devices), contrary to the 404 recorded
   * here on 2026-08-31. The backend added this route since then.
   */
  get: async (id: string): Promise<User> => {
    if (useMock) {
      return mockDelay(150).then(() => mockDb.getUser(id) ?? Promise.reject(new Error("Not found")));
    }
    const { data } = await api.get(`/admin/users/${id}`);
    return normalizeUser(data?.data?.user ?? data?.user ?? data);
  },
  /**
   * PATCH /admin/users/:id/status with { is_active }. Verified live
   * 2026-09-07 — this is the real status-update endpoint; `/users/:id/block`,
   * `/users/:id/unblock` and `/admin/users/:id` (PUT/PATCH) all 404. Response
   * message is "User blocked"/"User unblocked" depending on the value sent.
   */
  updateStatus: (id: string, isActive: boolean): Promise<void> =>
    useMock
      ? mockDelay(200).then(() => {
          isActive ? mockDb.unblockUser(id) : mockDb.blockUser(id);
        })
      : api.patch(`/admin/users/${id}/status`, { is_active: isActive }).then(() => undefined),
  block: (id: string): Promise<void> => usersApi.updateStatus(id, false),
  unblock: (id: string): Promise<void> => usersApi.updateStatus(id, true),
  /**
   * NO BACKEND ROUTE. Verified live 2026-09-07 with a valid admin token:
   * `/users/:id/grant-access` and every `/admin/...grant...` variant tried
   * return a genuine 404 "Not Found" (not the blanket 401 the /admin
   * namespace gives for made-up paths, so this is a real absence, not an
   * auth gate). Manually granting a user access to paid content has no
   * server-side support; left pointing at its original path rather than
   * disguised as fixed.
   */
  grantAccess: (id: string, payload?: Record<string, unknown>): Promise<void> =>
    useMock ? mockDelay(200).then(() => undefined) : api.post(`/users/${id}/grant-access`, payload).then(() => undefined),
};
