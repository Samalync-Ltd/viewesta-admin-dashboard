/**
 * The ONLY content statuses the backend accepts.
 *
 * Verified against:
 *   - schema.sql  -> movies_status_check / series_status_check
 *     CHECK (status IN ('pending','approved','rejected','draft'))
 *   - src/utils/validation.js -> movieValidation.update / showValidation.update
 *     Joi.string().valid('pending','approved','rejected','draft')
 *
 * "published" and "archived" do NOT exist anywhere in the backend (0 hits in
 * src/, not in the DB CHECK constraint, not in Joi). Sending either one makes
 * the request fail with a 400 validation error. `approved` is the single gate
 * that makes content visible to end users:
 *   - movieController.getMovies forces status='approved' for non-admins
 *   - isMovieAccessibleToUser() returns true only for status==='approved'
 */
export const CONTENT_STATUSES = ["approved", "pending", "draft", "rejected"] as const;

export type BackendContentStatus = (typeof CONTENT_STATUSES)[number];

/** Statuses surfaced as filter tabs in the admin content list. */
export const STATUS_FILTERS = ["approved", "pending", "draft"] as const;

export type StatusFilter = (typeof STATUS_FILTERS)[number];

export const STATUS_LABELS: Record<string, string> = {
  approved: "Approved",
  pending: "Pending",
  draft: "Draft",
  rejected: "Rejected",
};

export function isBackendStatus(value: unknown): value is BackendContentStatus {
  return CONTENT_STATUSES.includes(value as BackendContentStatus);
}

/** Tailwind classes for the status pill. */
export function statusBadgeClass(status?: string): string {
  switch (status) {
    case "approved":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400";
    case "pending":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400";
    case "draft":
      return "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400";
    case "rejected":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
    default:
      return "bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300";
  }
}
