import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { authApi } from "../api/auth";
import { getStoredToken, clearStoredTokens } from "../api/client";
import { unregisterPushNotifications, registerPushNotifications } from "../api/notifications";
import type { AdminUser, LoginPayload } from "../types/auth";

interface AuthState {
  user: AdminUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  /** Why the last session was ended (e.g. a non-admin account); shown on the login page. */
  notice: string | null;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => void;
  refetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const NOT_ADMIN_MESSAGE =
  "This account doesn't have admin access. Sign in with an admin account.";

/**
 * GET /auth/me for the dashboard. A stored session that belongs to a viewer
 * or filmmaker is ended here, through the same "auth:logout" event a 401 uses.
 */
async function fetchAdminUser() {
  const user = await authApi.me();
  if (user && !user.isAdmin) {
    await authApi.logout().catch(() => {});
    clearStoredTokens();
    window.dispatchEvent(new CustomEvent("auth:logout", { detail: { reason: NOT_ADMIN_MESSAGE } }));
  }
  return user;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const [notice, setNotice] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const {
    data: apiUser,
    isLoading: userLoading,
    refetch: refetchUser,
  } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: fetchAdminUser,
    enabled: !!token,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const user = apiUser ?? null;

  useEffect(() => {
    if (!token) return;
    const handleLogout = (event: Event) => {
      setToken(null);
      queryClient.clear();
      setNotice((event as CustomEvent<{ reason?: string }>).detail?.reason ?? null);
    };
    window.addEventListener("auth:logout", handleLogout);
    return () => window.removeEventListener("auth:logout", handleLogout);
  }, [token, queryClient]);

  const login = useCallback(
    async (payload: LoginPayload) => {
      const res = await authApi.login(payload);
      const me = await queryClient.fetchQuery({ queryKey: ["auth", "me"], queryFn: authApi.me, staleTime: 0 });
      if (!me?.isAdmin) {
        // Valid credentials, but not an admin account: end that session here.
        await authApi.logout().catch(() => {});
        clearStoredTokens();
        queryClient.removeQueries({ queryKey: ["auth", "me"] });
        throw new Error(NOT_ADMIN_MESSAGE);
      }
      setNotice(null);
      setToken(res.token);

      // Register push notifications silently in background (same as frontend)
      registerPushNotifications().catch((err) => {
        console.warn("[Auth] Push notification registration failed silently:", err);
      });
    },
    [queryClient]
  );

  const logout = useCallback(() => {
    void unregisterPushNotifications();
    clearStoredTokens();
    setToken(null);
    queryClient.clear();
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: user ?? null,
      token,
      isAuthenticated: !!token && !!user && !!user.isAdmin,
      isLoading: !!token && userLoading,
      notice,
      login,
      logout,
      refetchUser: async () => {
        await refetchUser();
      },
    }),
    [user, token, userLoading, notice, login, logout, refetchUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
