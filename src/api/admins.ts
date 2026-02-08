import { api } from "./client";
import { useMock } from "../config/useMock";
import { mockDb, mockDelay } from "../data/mockDb";
import type { AdminUser } from "../types/auth";

export const adminsApi = {
  list: () =>
    useMock
      ? mockDelay(200).then(() => mockDb.getAdmins())
      : api.get<AdminUser[]>("/admins").then((r) => r.data),
};
