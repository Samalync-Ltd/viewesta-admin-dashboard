import { api } from "./client";
import { useMock } from "../config/useMock";
import { mockDb, mockDelay } from "../data/mockDb";
import type { Report } from "../types/models";
import type { PaginatedResponse, ListParams } from "../types/api";

export const reportsApi = {
  list: (params?: ListParams) =>
    useMock
      ? mockDelay(250).then(() => mockDb.getReports(params))
      : api.get<PaginatedResponse<Report>>("/reports", { params }).then((r) => r.data),
  get: (id: string) =>
    useMock
      ? mockDelay(150).then(() => mockDb.getReport(id) ?? Promise.reject(new Error("Not found")))
      : api.get<Report>(`/reports/${id}`).then((r) => r.data),
  resolve: (id: string, action?: string) =>
    useMock ? mockDelay(200).then(() => {}) : api.post(`/reports/${id}/resolve`, { action }),
  warn: (targetType: string, targetId: string, message: string) =>
    api.post("/reports/warn", { targetType, targetId, message }),
  disable: (targetType: string, targetId: string, reason?: string) =>
    api.post("/reports/disable", { targetType, targetId, reason }),
};
