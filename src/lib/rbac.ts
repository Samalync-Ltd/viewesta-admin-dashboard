import type { AdminRole } from "../types/auth";
import { ROLE_HIERARCHY } from "../types/auth";

export type Permission =
  | "overview"
  | "content:movies"
  | "content:genres"
  | "content:categories"
  | "filmmakers"
  | "users"
  | "monetization:plans"
  | "monetization:subscriptions"
  | "monetization:tvod"
  | "monetization:wallet"
  | "downloads"
  | "ratings"
  | "notifications"
  | "settings";

const ROLE_PERMISSIONS: Record<AdminRole, Permission[]> = {
  super_admin: [
    "overview",
    "content:movies",
    "content:genres",
    "content:categories",
    "filmmakers",
    "users",
    "monetization:plans",
    "monetization:subscriptions",
    "monetization:tvod",
    "monetization:wallet",
    "downloads",
    "ratings",
    "notifications",
    "settings",
  ],
  content_admin: [
    "overview",
    "content:movies",
    "content:genres",
    "content:categories",
    "filmmakers",
    "ratings",
  ],
  support: [
    "overview",
    "users",
    "monetization:subscriptions",
    "monetization:tvod",
  ],
};

export function hasPermission(role: AdminRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function hasMinRole(role: AdminRole, minRole: AdminRole): boolean {
  return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[minRole];
}
