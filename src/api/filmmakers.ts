import { api } from "./client";
import { useMock } from "../config/useMock";
import { mockDb, mockDelay } from "../data/mockDb";
import type { PaginatedResponse, ListParams } from "../types/api";
import type { Filmmaker } from "../types/models";

export const filmmakersApi = {
  list: (params?: ListParams) =>
    useMock
      ? mockDelay(250).then(() => mockDb.getFilmmakers(params))
      : api.get<PaginatedResponse<Filmmaker>>("/filmmakers", { params }).then((r) => r.data),
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
