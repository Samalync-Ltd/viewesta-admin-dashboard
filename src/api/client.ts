import axios, { type AxiosError } from "axios";
import { env } from "../config/env";

const TOKEN_KEY = "viewesta_admin_token";
const REFRESH_KEY = "viewesta_admin_refresh";

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredTokens(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
}


export function setStoredRefreshToken(token: string): void {
  localStorage.setItem(REFRESH_KEY, token);
}

export const api = axios.create({
  baseURL: env.apiBaseUrl,
});

api.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err: AxiosError<{ message?: string; code?: string }>) => {
    if (err.response?.status === 401) {
      clearStoredTokens();
      window.dispatchEvent(new CustomEvent("auth:logout"));
    }
    return Promise.reject(err);
  }
);

export function isAuthError(err: unknown): boolean {
  return axios.isAxiosError(err) && err.response?.status === 401;
}
