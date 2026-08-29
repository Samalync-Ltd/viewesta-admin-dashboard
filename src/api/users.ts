import { api } from "./client";
import { useMock } from "../config/useMock";
import { mockDb, mockDelay } from "../data/mockDb";
import type { PaginatedResponse, ListParams } from "../types/api";
import type { User } from "../types/models";

function toQuery(params?: ListParams) {
  const limit = Number(params?.limit ?? 20);
  const page = Number(params?.page ?? 1);
  const offset = (page - 1) * limit;
  const q: Record<string, any> = { ...params, limit, offset };
  delete q.page;
  return q;
}

export const usersApi = {
  list: (params?: ListParams) =>
    useMock
      ? mockDelay(250).then(() => mockDb.getUsers(params))
      : api.get<PaginatedResponse<User>>("/admin/users", { params: toQuery(params) }).then((r) => r.data),
  get: (id: string) =>
    useMock
      ? mockDelay(150).then(() => mockDb.getUser(id) ?? Promise.reject(new Error("Not found")))
      : api.get<User>(`/admin/users/${id}`).then((r) => r.data),
  block: (id: string): Promise<void> =>
    useMock ? mockDelay(200).then(() => { mockDb.blockUser(id); }) : api.post(`/users/${id}/block`).then(() => undefined),
  unblock: (id: string): Promise<void> =>
    useMock ? mockDelay(200).then(() => { mockDb.unblockUser(id); }) : api.post(`/users/${id}/unblock`).then(() => undefined),
  grantAccess: (id: string, payload?: Record<string, unknown>): Promise<void> =>
    useMock ? mockDelay(200).then(() => undefined) : api.post(`/users/${id}/grant-access`, payload).then(() => undefined),
};
