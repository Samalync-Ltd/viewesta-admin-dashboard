import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { hasPermission, type Permission } from "../../lib/rbac";

interface ProtectedRouteProps {
  children: React.ReactNode;
  permission?: Permission;
}

export function ProtectedRoute({ children, permission }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 dark:bg-slate-900">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (permission && !hasPermission(user.role, permission)) {
    if (location.pathname === "/") {
      return (
        <div className="flex min-h-screen items-center justify-center bg-black px-4 text-white">
          <div className="max-w-md text-center">
            <h2 className="mb-2 text-2xl font-bold">Access Denied</h2>
            <p className="text-neutral-400">You do not have permission to view this dashboard. Please contact an administrator.</p>
          </div>
        </div>
      );
    }
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
