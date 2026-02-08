import { api, setStoredToken, setStoredRefreshToken } from "./client";
import type { LoginPayload, AuthResponse } from "../types/auth";

export const authApi = {
  login: async (payload: LoginPayload): Promise<AuthResponse> => {
    const { data } = await api.post<AuthResponse>("/auth/login", payload);
    setStoredToken(data.token);
    if (data.refreshToken) setStoredRefreshToken(data.refreshToken);
    return data;
  },
  me: async () => {
    const { data } = await api.get<AuthResponse["admin"]>("/auth/me");
    return data;
  },
  logout: async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      // Clear on client regardless
    }
  },
};
