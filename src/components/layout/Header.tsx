import { useNavigate } from "react-router-dom";
import { LogOut, Moon, Sun, Bell } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import { ROLE_LABELS } from "../../types/auth";

export function Header() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
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
          onClick={toggleTheme}
          className="rounded-lg p-2.5 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-neutral-100"
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
        <button
          type="button"
          className="rounded-lg p-2.5 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-neutral-100"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
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
