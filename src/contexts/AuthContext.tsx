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
} from "../api/client";
import type { AdminUser, LoginPayload } from "../types/auth";

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
  const queryClient = useQueryClient();

  const {
    data: apiUser,
    isLoading: userLoading,
    refetch: refetchUser,
  } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: authApi.me,
    enabled: !!token,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const user = apiUser ?? null;

  useEffect(() => {
    if (!token) return;
    const handleLogout = () => {
      setToken(null);
      queryClient.clear();
    };
    window.addEventListener("auth:logout", handleLogout);
    return () => window.removeEventListener("auth:logout", handleLogout);
  }, [token, queryClient]);

  const login = useCallback(
    async (payload: LoginPayload) => {
      const res = await authApi.login(payload);
      setToken(res.token);
      await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
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
