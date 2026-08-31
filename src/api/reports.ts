import { api } from "./client";
import { useMock } from "../config/useMock";
import { toListQuery, toPaginatedList } from "./listQuery";
import { mockDb, mockDelay } from "../data/mockDb";
import type { Report } from "../types/models";
import type { ListParams } from "../types/api";

export const reportsApi = {
  list: (params?: ListParams) =>
    useMock
      ? mockDelay(250).then(() => mockDb.getReports(params))
      : // NO BACKEND ROUTE: GET /reports returns 404 (verified live
        // 2026-08-31). Left on its current path because there is no correct
        // path to move it to — content reporting does not exist server-side.
        // Still routed through toListQuery so it sends limit+offset, not the
        // unsupported `page`, once the endpoint is built.
        api
          .get("/reports", { params: toListQuery({ limit: 20, ...(params ?? {}) }).query })
          .then((r) => {
            const { page, limit } = toListQuery({ limit: 20, ...(params ?? {}) });
            return toPaginatedList<Report>(r.data, "reports", page, limit);
          }),
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
