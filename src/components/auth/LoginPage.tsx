import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { Film } from "lucide-react";
import axios from "axios";

/** What to tell the admin when sign-in fails. The API answers bad credentials with 401 "Invalid credentials". */
function loginErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status;
    if (!err.response) return "Can't reach the server. Check your connection and try again.";
    if (status === 401 || status === 400) return "Incorrect username or password.";
    if (status === 429) return "Too many sign-in attempts. Wait a moment and try again.";
    if (status && status >= 500) return "The server had a problem. Please try again in a moment.";
    return (err.response?.data as { message?: string })?.message || "Sign-in failed. Please try again.";
  }
  return (err as Error)?.message || "Sign-in failed. Please try again.";
}

export function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, notice } = useAuth();

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? "/";

  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  if (isAuthenticated) {
    navigate(from, { replace: true });
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login({ 
        identifier, 
        password,
        device_id: "web-demo",
        device_name: "Chrome",
        device_type: "web"
      });
      navigate(from, { replace: true });
    } catch (err) {
      setError(loginErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-4">
      <div className="w-full max-w-sm animate-fade-in rounded-2xl border border-neutral-800 bg-surface-card p-8 shadow-card">
        <div className="mb-8 flex items-center justify-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-500/20">
            <Film className="h-7 w-7 text-primary-500" />
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight text-white">Viewesta</span>
            <span className="ml-1.5 block text-xs font-medium uppercase tracking-wider text-primary-500">Admin</span>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="identifier" className="mb-1.5 block text-sm font-medium text-neutral-300">
              Identifier (Username/Email)
            </label>
            <input
              id="identifier"
              type="text"
              value={identifier}
              onChange={(e) => { setIdentifier(e.target.value); setError(null); }}
              required
              autoComplete="username"
              className="input-field"
              placeholder="admin2"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-neutral-300">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(null); }}
              required
              autoComplete="current-password"
              className="input-field"
              placeholder="••••••••"
            />
          </div>
          {(error || notice) && (
            <p role="alert" className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error || notice}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
