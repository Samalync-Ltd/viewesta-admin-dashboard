import { useNavigate } from "react-router-dom";
import { LogOut, Bell } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useNotification } from "../../contexts/NotificationContext";
import { ROLE_LABELS } from "../../types/auth";

export function Header() {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotification();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-neutral-800/80 bg-surface-card px-6">
      <div className="flex-1" />
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => navigate("/notifications")}
          className="relative rounded-lg p-2.5 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-neutral-100"
          aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
        >
          <Bell className={`h-5 w-5 ${unreadCount > 0 ? "animate-bounce text-primary-400" : ""}`} />
          {unreadCount > 0 && (
            <>
              {/* Pulsing halo makes an unread count visible in peripheral vision. */}
              <span className="absolute -right-1 -top-1 h-5 min-w-5 animate-ping rounded-full bg-primary-500/60" />
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-500 px-1 text-[11px] font-semibold text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            </>
          )}
        </button>
        <div className="ml-2 flex items-center gap-3 border-l border-neutral-700 pl-4">
          <div className="text-right">
            <p className="text-sm font-medium text-white">
              {user?.name || user?.email}
            </p>
            <p className="text-xs text-neutral-500">
              {user ? ROLE_LABELS[user.role] : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg p-2.5 text-neutral-400 transition-colors hover:bg-red-500/10 hover:text-red-400"
            aria-label="Log out"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
