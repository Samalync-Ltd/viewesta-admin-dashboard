import { api, setStoredToken, setStoredRefreshToken } from "./client";
import type { AdminRole, LoginPayload } from "../types/auth";

const ADMIN_ROLES: AdminRole[] = ["super_admin", "content_admin", "support"];

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
    if (!user) return user;
    // Only admin accounts may use the dashboard. users.user_type is
    // 'viewer' | 'filmmaker' | 'admin'; the API has no finer admin role yet,
    // so an admin account gets full (super_admin) access. Viewers and
    // filmmakers used to be given super_admin here as well.
    const hasAdminRole = ADMIN_ROLES.includes(user.role);
    user.isAdmin = hasAdminRole || String(user.user_type ?? "").toLowerCase() === "admin";
    if (!hasAdminRole) user.role = user.isAdmin ? "super_admin" : undefined;
    if (!user.name) {
      user.name = [user.first_name, user.last_name].filter(Boolean).join(" ") || user.identifier || user.email || "Admin";
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
