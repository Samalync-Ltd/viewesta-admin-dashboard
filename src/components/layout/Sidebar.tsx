import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Film,
  Users,
  Wallet,
  Download,
  Star,
  Bell,
  Settings,
  UserCog,
  FolderOpen,
  Tags,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { hasPermission } from "../../lib/rbac";
import clsx from "clsx";

const navItems: { path: string; label: string; icon: typeof LayoutDashboard; permission?: import("../../lib/rbac").Permission }[] = [
  { path: "/", label: "Overview", icon: LayoutDashboard, permission: "overview" },
  { path: "/content/movies", label: "Movies & Shows", icon: Film, permission: "content:movies" },
  { path: "/content/genres", label: "Genres", icon: Tags, permission: "content:genres" },
  { path: "/content/categories", label: "Categories", icon: FolderOpen, permission: "content:categories" },
  { path: "/filmmakers", label: "Filmmakers", icon: UserCog, permission: "filmmakers" },
  { path: "/users", label: "Users", icon: Users, permission: "users" },
  { path: "/monetization", label: "Monetization", icon: Wallet, permission: "monetization:plans" },
  { path: "/downloads", label: "Downloads & DRM", icon: Download, permission: "downloads" },
  { path: "/ratings", label: "Ratings", icon: Star, permission: "ratings" },
  { path: "/notifications", label: "Notifications", icon: Bell, permission: "notifications" },
  { path: "/settings", label: "Settings", icon: Settings, permission: "settings" },
];

export function Sidebar() {
  const { user } = useAuth();
  const role = user?.role ?? "support";

  const visible = navItems.filter(
    (item) => !item.permission || hasPermission(role, item.permission)
  );

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-neutral-800/80 bg-surface-elevated">
      <div className="flex h-full flex-col">
        <div className="flex h-16 items-center border-b border-neutral-800/80 px-6">
          <span className="text-lg font-bold tracking-tight text-white">
            Viewesta
          </span>
          <span className="ml-1.5 text-xs font-medium uppercase tracking-wider text-primary-500">
            Admin
          </span>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
          {visible.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              className={({ isActive }) =>
                clsx(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-primary-500/15 text-primary-400"
                    : "text-neutral-400 hover:bg-neutral-800/80 hover:text-neutral-100"
                )
              }
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </aside>
  );
}
