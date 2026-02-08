import { api } from "./client";
import { useMock } from "../config/useMock";
import { mockDb, mockDelay } from "../data/mockDb";
import type { PaginatedResponse, ListParams } from "../types/api";
import type { User } from "../types/models";

export const usersApi = {
  list: (params?: ListParams) =>
    useMock
      ? mockDelay(250).then(() => mockDb.getUsers(params))
      : api.get<PaginatedResponse<User>>("/users", { params }).then((r) => r.data),
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
