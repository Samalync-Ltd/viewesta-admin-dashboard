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
import axios from "axios";
import { authApi } from "../api/auth";
import {
  getStoredToken,
  setStoredToken,
  clearStoredTokens,
  DEV_TOKEN,
} from "../api/client";
import type { AdminUser, LoginPayload } from "../types/auth";

/** Dev-only: use these credentials when the backend is not running (e.g. 404). */
export const DEV_LOGIN = {
  email: "admin@viewesta.com",
  password: "admin123",
} as const;
const DEV_USER: AdminUser = {
  id: "dev-admin-1",
  email: DEV_LOGIN.email,
  name: "Admin",
  role: "super_admin",
};

interface AuthState {
  user: AdminUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => void;
  refetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const [devUser, setDevUser] = useState<AdminUser | null>(null);
  const queryClient = useQueryClient();

  const isDevSession = token === DEV_TOKEN;

  const {
    data: apiUser,
    isLoading: userLoading,
    refetch: refetchUser,
  } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: authApi.me,
    enabled: !!token && !isDevSession,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const user = isDevSession ? devUser : apiUser ?? null;

  useEffect(() => {
    if (!token) return;
    const handleLogout = () => {
      setToken(null);
      setDevUser(null);
      queryClient.clear();
    };
    window.addEventListener("auth:logout", handleLogout);
    return () => window.removeEventListener("auth:logout", handleLogout);
  }, [token, queryClient]);

  const login = useCallback(
    async (payload: LoginPayload) => {
      const isDevCredentials =
        payload.email === DEV_LOGIN.email && payload.password === DEV_LOGIN.password;

      if (isDevCredentials) {
        setStoredToken(DEV_TOKEN);
        setToken(DEV_TOKEN);
        setDevUser(DEV_USER);
        return;
      }

      try {
        const res = await authApi.login(payload);
        setToken(res.token);
        await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 404) {
          setStoredToken(DEV_TOKEN);
          setToken(DEV_TOKEN);
          setDevUser(DEV_USER);
          return;
        }
        throw err;
      }
    },
    [queryClient]
  );

  const logout = useCallback(() => {
    clearStoredTokens();
    setToken(null);
    queryClient.clear();
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: user ?? null,
      token,
      isAuthenticated: !!token && !!user,
      isLoading: !!token && userLoading,
      login,
      logout,
      refetchUser: async () => {
        await refetchUser();
      },
    }),
    [user, token, userLoading, login, logout, refetchUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
