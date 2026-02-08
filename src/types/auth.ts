export type AdminRole = "super_admin" | "content_admin" | "support";

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  avatarUrl?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  refreshToken?: string;
  expiresIn: number;
  admin: AdminUser;
}

export const ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: "Super Admin",
  content_admin: "Content Admin",
  support: "Support / Moderator",
};

export const ROLE_HIERARCHY: Record<AdminRole, number> = {
  super_admin: 3,
  content_admin: 2,
  support: 1,
};
