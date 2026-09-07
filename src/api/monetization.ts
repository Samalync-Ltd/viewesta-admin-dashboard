import { api } from "./client";
import { useMock } from "../config/useMock";
import { toListQuery, toPaginatedList, unwrapCollection } from "./listQuery";
import { mockDb, mockDelay } from "../data/mockDb";
import type { SubscriptionPlan } from "../types/models";
import type { PaginatedResponse, ListParams } from "../types/api";

export interface Subscription {
  id: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  planId: string;
  status: string;
  startDate: string;
  endDate?: string;
  price?: number;
  currency?: string;
  autoRenew?: boolean;
}

export interface TvodPurchase {
  id: string;
  userId: string;
  userEmail?: string;
  movieId: string;
  movieTitle?: string;
  amount: number;
  currency?: string;
  status?: string;
  createdAt: string;
}

/**
 * GET /admin/transactions returns transaction_type ∈ {subscription,
 * wallet_topup, purchase} (verified live 2026-09-07, 50-row sample) — there
 * is no "credit"/"debit"/"refund" domain on the backend at all, so that
 * union was fictional. Only wallet_topup actually adds money to the wallet;
 * the others are outgoing payments.
 */
export interface WalletTransaction {
  id: string;
  userId: string;
  userEmail?: string;
  type: "subscription" | "wallet_topup" | "purchase" | string;
  amount: number;
  status?: string;
  createdAt: string;
}

/**
 * The real rows out of /admin/subscriptions, /admin/purchases and
 * /admin/transactions are snake_case and don't match the camelCase fields
 * above field-for-field (verified live 2026-09-07). Envelope unwrapping
 * (toPaginatedList) already worked; per-row mapping never existed, so every
 * list rendered with every field blank/undefined even though real rows came
 * back — e.g. an admin/subscriptions response with an active subscription
 * still showed "User undefined · Plan undefined".
 */
function normalizeSubscription(raw: any): Subscription {
  return {
    id: raw?.id,
    userId: raw?.user_id,
    userEmail: raw?.email,
    userName: raw?.user_name,
    planId: raw?.plan_type,
    status: raw?.is_active === false ? "inactive" : raw?.status || "active",
    startDate: raw?.start_date,
    endDate: raw?.end_date,
    price: raw?.price != null ? Number(raw.price) : undefined,
    currency: raw?.currency,
    autoRenew: raw?.auto_renew,
  };
}

function normalizeTvodPurchase(raw: any): TvodPurchase {
  return {
    id: raw?.id,
    userId: raw?.user_id,
    userEmail: raw?.user_email,
    movieId: raw?.movie_id,
    movieTitle: raw?.movie_title,
    amount: Number(raw?.price_paid ?? raw?.amount ?? 0) || 0,
    currency: raw?.currency ?? undefined,
    status: raw?.transaction_status ?? undefined,
    createdAt: raw?.created_at,
  };
}

function normalizeTransaction(raw: any): WalletTransaction {
  return {
    id: raw?.id,
    userId: raw?.user_id,
    userEmail: raw?.user_email,
    type: raw?.transaction_type,
    amount: Number(raw?.amount ?? 0) || 0,
    status: raw?.status,
    createdAt: raw?.created_at,
  };
}

export const monetizationApi = {
  plans: {
    list: () =>
      useMock
        ? mockDelay(200).then(() => mockDb.getPlans())
        : // {data:{plans:[...]}} — returning r.data handed back the envelope,
          // so the plans list read as a non-array and rendered nothing.
          // The backend plan objects also have no `id` field at all (`type`
          // is the identifier, e.g. "monthly"/"yearly"/"mobile") and no
          // `enabled` flag — verified live 2026-09-07.
          api
            .get("/subscriptions/plans")
            .then((r) =>
              unwrapCollection<any>(r.data, "plans").map(
                (p): SubscriptionPlan => ({
                  id: p.type,
                  name: p.name,
                  type: p.type,
                  price: Number(p.price ?? 0) || 0,
                  currency: p.currency,
                  enabled: true, // the endpoint only ever returns live/purchasable plans
                }),
              ),
            ),
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
      const page_ = toPaginatedList<any>(data, "subscriptions", page, limit);
      return { ...page_, data: page_.data.map(normalizeSubscription) };
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
      const page_ = toPaginatedList<any>(data, "purchases", page, limit);
      return { ...page_, data: page_.data.map(normalizeTvodPurchase) };
    },
  },
  wallet: {
    /**
     * GET /admin/transactions — `/monetization/wallet/transactions` 404s.
     *
     * Re-verified live 2026-09-07: this now returns 200 with real data
     * (transaction_type/subscription/wallet_topup/purchase rows), unlike the
     * HTTP 500 "paging is not defined" recorded here on 2026-08-31 — the
     * backend fixed that handler since. The path was always correct; the
     * only remaining bug was the missing field mapping below.
     */
    transactions: async (
      params?: ListParams,
    ): Promise<PaginatedResponse<WalletTransaction>> => {
      if (useMock) {
        return mockDelay(250).then(() => mockDb.getWalletTransactions(params));
      }
      const { query, page, limit } = toListQuery({ limit: 20, ...(params ?? {}) });
      const { data } = await api.get("/admin/transactions", { params: query });
      const page_ = toPaginatedList<any>(data, "transactions", page, limit);
      return { ...page_, data: page_.data.map(normalizeTransaction) };
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
