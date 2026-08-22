/**
 * In development, VITE_API_BASE_URL should be set to "/api/v1" to use the Vite
 * dev proxy (see vite.config.ts) and avoid CORS issues.
 *
 * In production (Vercel), set VITE_API_BASE_URL to the full backend URL
 * e.g. "https://api.viewesta.com/api/v1".
 */
export const env = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || "/api/v1",
} as const;
