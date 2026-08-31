import type { ListParams, PaginatedResponse } from "../types/api";

/**
 * Shared pagination + envelope helpers for every admin list endpoint.
 *
 * Two things were wrong across the API layer and both are fixed here so there
 * is one place to get them right:
 *
 * 1. `?page=` is not supported by any endpoint. Callers that spread
 *    `{ params }` straight into axios sent `page`, which the backend's Joi
 *    schemas strip with `stripUnknown`, so every request silently returned
 *    page 1 no matter what the admin clicked. The contract is `limit` +
 *    `offset`, with `offset = (page - 1) * limit`.
 *
 * 2. Responses are enveloped as
 *      { success, message, data: { <key>: [...], pagination: {...} } }
 *    Returning `r.data` hands the caller the envelope, not the rows, so typed
 *    fields like `.data` / `.total` came back undefined and the screens
 *    rendered empty. Verified live 2026-08-31 against /admin/users,
 *    /admin/subscriptions and /admin/purchases, which all use this shape.
 *
 * The admin UI keeps thinking in pages; the page->offset conversion happens
 * only here, at the API call layer.
 */
export function toListQuery(params?: ListParams): {
  query: Record<string, string | number>;
  page: number;
  limit: number;
} {
  const raw = { ...(params ?? {}) } as Record<string, unknown>;
  const limit = Number(raw.limit ?? 20) || 20;
  const page = Number(raw.page ?? 1) || 1;
  const offset = Number(raw.offset ?? (page - 1) * limit) || 0;

  delete raw.page;
  delete raw.offset;
  delete raw.limit;

  const query: Record<string, string | number> = { limit, offset };

  // `sort`/`order` are only forwarded when asked for: several admin endpoints
  // reject unknown sort columns rather than ignoring them.
  const sortBy = raw.sort_by ?? raw.sort;
  if (typeof sortBy === "string" && sortBy) query.sort_by = sortBy;
  const order = raw.order;
  if (typeof order === "string" && order) {
    query.order = order.toUpperCase() === "ASC" ? "ASC" : "DESC";
  }
  delete raw.sort_by;
  delete raw.sort;
  delete raw.order;

  for (const [key, value] of Object.entries(raw)) {
    if (value === undefined || value === null || value === "") continue;
    query[key] = value as string | number;
  }

  return { query, page, limit };
}

/**
 * Unwrap `{ data: { <key>: [...], pagination } }` into a PaginatedResponse.
 * `key` is the collection name the endpoint uses (`users`, `subscriptions`,
 * `purchases`, `transactions`, …); the fallbacks cover endpoints that return a
 * bare array or an `items` key.
 */
export function toPaginatedList<T>(
  payload: any,
  key: string,
  page: number,
  limit: number,
): PaginatedResponse<T> {
  const body = payload?.data ?? payload;
  const items: T[] = Array.isArray(body?.[key])
    ? body[key]
    : Array.isArray(body?.items)
      ? body.items
      : Array.isArray(body?.data)
        ? body.data
        : Array.isArray(body)
          ? body
          : [];

  const pagination = body?.pagination ?? {};
  const total = Number(pagination.total ?? items.length) || 0;
  const effectiveLimit = Number(pagination.limit ?? limit) || limit;

  return {
    data: items,
    total,
    page,
    limit: effectiveLimit,
    totalPages:
      Number(pagination.pages) || Math.max(1, Math.ceil(total / effectiveLimit)),
  };
}

/** Unwrap `{ data: { <key>: [...] } }` for endpoints with no pagination. */
export function unwrapCollection<T>(payload: any, key: string): T[] {
  const body = payload?.data ?? payload;
  if (Array.isArray(body?.[key])) return body[key];
  if (Array.isArray(body?.items)) return body.items;
  if (Array.isArray(body?.data)) return body.data;
  return Array.isArray(body) ? body : [];
}
