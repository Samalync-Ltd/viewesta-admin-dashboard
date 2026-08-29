import { api } from "./client";
import { useMock } from "../config/useMock";
import { mockDb, mockDelay } from "../data/mockDb";
import type { SubscriptionPlan } from "../types/models";
import type { PaginatedResponse, ListParams } from "../types/api";

function toQuery(params?: ListParams) {
  const limit = Number(params?.limit ?? 20);
  const page = Number(params?.page ?? 1);
  const offset = (page - 1) * limit;
  const q: Record<string, any> = { ...params, limit, offset };
  delete q.page;
  return q;
}

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
        : api.get<SubscriptionPlan[]>('/subscriptions/plans').then((r) => r.data),
    create: (body: Partial<SubscriptionPlan>) =>
      api.post<SubscriptionPlan>("/subscriptions/plans", body).then((r) => r.data),
    update: (id: string, body: Partial<SubscriptionPlan>) =>
      api.patch<SubscriptionPlan>(`/subscriptions/plans/${id}`, body).then((r) => r.data),
    delete: (id: string) => api.delete(`/subscriptions/plans/${id}`),
  },
  subscriptions: {
    list: (params?: ListParams) =>
      useMock
        ? mockDelay(250).then(() => mockDb.getSubscriptions(params))
        : api.get<PaginatedResponse<Subscription>>("/admin/subscriptions", { params: toQuery(params) }).then((r) => r.data),
  },
  tvod: {
    purchases: (params?: ListParams) =>
      useMock
        ? mockDelay(250).then(() => mockDb.getTvodPurchases(params))
        : api.get<PaginatedResponse<TvodPurchase>>("/admin/purchases", { params: toQuery(params) }).then((r) => r.data),
  },
  wallet: {
    transactions: (params?: ListParams) =>
      useMock
        ? mockDelay(250).then(() => mockDb.getWalletTransactions(params))
        : api.get<PaginatedResponse<WalletTransaction>>("/admin/transactions", { params: toQuery(params) }).then((r) => r.data),
    credit: (userId: string, amount: number, reason?: string) =>
      api.post("/monetization/wallet/credit", { userId, amount, reason }),
    debit: (userId: string, amount: number, reason?: string) =>
      api.post("/monetization/wallet/debit", { userId, amount, reason }),
  },
};
