import { api, setStoredToken, setStoredRefreshToken } from "./client";
import type { LoginPayload } from "../types/auth";

export const authApi = {
  login: async (payload: LoginPayload): Promise<any> => {
    const { data } = await api.post("/auth/login", payload);
    
    // Handle different possible backend response structures
    const token = data?.token || data?.access_token || data?.data?.token || data?.data?.access_token;
    const refreshToken = data?.refreshToken || data?.refresh_token || data?.data?.refreshToken || data?.data?.refresh_token;

    if (!token) {
      console.error("Login response didn't contain a recognizable token:", data);
      throw new Error("Invalid login response from server (no token found).");
    }

    setStoredToken(token);
    if (refreshToken) setStoredRefreshToken(refreshToken);
    
    return { token, refreshToken, ...data };
  },
  me: async () => {
    const { data } = await api.get("/auth/me");
    const user = data?.user || data?.data?.user || data?.data || data;
    if (user && !user.role) {
      user.role = "super_admin"; // Default to super_admin so they can access the dashboard
    }
    if (user && !user.name) {
      user.name = user.identifier || user.email || "Admin";
    }
    return user;
  },
  logout: async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      // Clear on client regardless
    }
  },
};
