import { api } from "./client";
import { useMock } from "../config/useMock";
import { toListQuery, toPaginatedList, unwrapCollection } from "./listQuery";
import { mockDb, mockDelay } from "../data/mockDb";
import type { SubscriptionPlan } from "../types/models";
import type { PaginatedResponse, ListParams } from "../types/api";

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  status: string;
  startDate: string;
  endDate?: string;
}

export interface TvodPurchase {
  id: string;
  userId: string;
  movieId: string;
  amount: number;
  createdAt: string;
}

export interface WalletTransaction {
  id: string;
  userId: string;
  type: "credit" | "debit" | "refund";
  amount: number;
  balanceAfter?: number;
  createdAt: string;
}

export const monetizationApi = {
  plans: {
    list: () =>
      useMock
        ? mockDelay(200).then(() => mockDb.getPlans())
        : // {data:{plans:[...]}} — returning r.data handed back the envelope,
          // so the plans list read as a non-array and rendered nothing.
          api
            .get("/subscriptions/plans")
            .then((r) => unwrapCollection<SubscriptionPlan>(r.data, "plans")),
    create: (body: Partial<SubscriptionPlan>) =>
      api.post<SubscriptionPlan>("/subscriptions/plans", body).then((r) => r.data),
    update: (id: string, body: Partial<SubscriptionPlan>) =>
      api.patch<SubscriptionPlan>(`/subscriptions/plans/${id}`, body).then((r) => r.data),
    delete: (id: string) => api.delete(`/subscriptions/plans/${id}`),
  },
  subscriptions: {
    /** GET /admin/subscriptions — `/monetization/subscriptions` 404s. */
    list: async (
      params?: ListParams,
    ): Promise<PaginatedResponse<Subscription>> => {
      if (useMock) return mockDelay(250).then(() => mockDb.getSubscriptions(params));
      const { query, page, limit } = toListQuery({ limit: 20, ...(params ?? {}) });
      const { data } = await api.get("/admin/subscriptions", { params: query });
      return toPaginatedList<Subscription>(data, "subscriptions", page, limit);
    },
  },
  tvod: {
    /** GET /admin/purchases — `/monetization/tvod/purchases` 404s. */
    purchases: async (
      params?: ListParams,
    ): Promise<PaginatedResponse<TvodPurchase>> => {
      if (useMock) return mockDelay(250).then(() => mockDb.getTvodPurchases(params));
      const { query, page, limit } = toListQuery({ limit: 20, ...(params ?? {}) });
      const { data } = await api.get("/admin/purchases", { params: query });
      return toPaginatedList<TvodPurchase>(data, "purchases", page, limit);
    },
  },
  wallet: {
    /**
     * GET /admin/transactions — `/monetization/wallet/transactions` 404s.
     *
     * HEADS UP: this endpoint is currently returning HTTP 500
     * `"paging is not defined"` (a server-side ReferenceError, verified live
     * 2026-08-31). The path here is correct; the screen will stay empty until
     * the backend fixes that handler. Nothing further can be done client-side.
     */
    transactions: async (
      params?: ListParams,
    ): Promise<PaginatedResponse<WalletTransaction>> => {
      if (useMock) {
        return mockDelay(250).then(() => mockDb.getWalletTransactions(params));
      }
      const { query, page, limit } = toListQuery({ limit: 20, ...(params ?? {}) });
      const { data } = await api.get("/admin/transactions", { params: query });
      return toPaginatedList<WalletTransaction>(data, "transactions", page, limit);
    },
    /**
     * NO BACKEND ROUTE. Verified live 2026-08-31: /monetization/wallet/credit,
     * /admin/wallet/credit and /wallet/credit all 404, likewise debit. Manual
     * wallet adjustment does not exist server-side and is not covered by the
     * path table; left unchanged rather than pointed at another 404.
     */
    credit: (userId: string, amount: number, reason?: string) =>
      api.post("/monetization/wallet/credit", { userId, amount, reason }),
    debit: (userId: string, amount: number, reason?: string) =>
      api.post("/monetization/wallet/debit", { userId, amount, reason }),
  },
};
