import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "react-router-dom";
import { Plus, Search, Edit, Trash2, Star } from "lucide-react";
import { contentApi } from "../../api/content";
import { Pagination } from "../../components/ui/Pagination";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { toast } from "../../components/ui/Toast";
import {
  STATUS_FILTERS,
  STATUS_LABELS,
  statusBadgeClass,
  type StatusFilter,
} from "../../lib/contentStatus";

const LIMIT = 20;

type Section = "movies" | "shows";

const SECTIONS: { key: Section; label: string }[] = [
  { key: "movies", label: "Movies" },
  { key: "shows", label: "Shows" },
];

export function MoviesPage() {
  const location = useLocation();
  // /content/shows lands directly on the Shows section; /content/movies on Movies.
  const [section, setSection] = useState<Section>(
    location.pathname.startsWith("/content/shows") ? "shows" : "movies"
  );
  const [status, setStatus] = useState<StatusFilter | "all">("all");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [pendingDelete, setPendingDelete] = useState<{ id: string; title: string } | null>(null);
  const queryClient = useQueryClient();

  const resetPaging = () => setPage(1);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["content", section, status, page, search],
    queryFn: () =>
      contentApi[section].list({
        page,
        limit: LIMIT,
        search: search || undefined,
        // Omitted entirely when "all" so an admin token gets every status back,
        // including drafts. Sending an empty string would fail Joi validation.
        status: status === "all" ? undefined : status,
        // Newest upload first — the backend's documented pagination contract.
        sort_by: "created_at",
        order: "desc",
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => contentApi[section].delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content", section] });
      setPendingDelete(null);
      toast(section === "movies" ? "Movie deleted" : "Show deleted", "success");
    },
    onError: (err: any) =>
      toast(err?.response?.data?.message ?? err?.message ?? "Delete failed", "error"),
  });

  const items: any[] = data?.data ?? [];
  const totalPages = data?.totalPages ?? 0;
  const isMovies = section === "movies";

  const switchSection = (next: Section) => {
    setSection(next);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Content</h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">
            Manage movies and shows, newest first
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            to="/content/movies/new"
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 font-medium text-white hover:bg-primary-700"
          >
            <Plus className="h-5 w-5" />
            Add Movie
          </Link>
          <Link
            to="/content/shows/new"
            className="inline-flex items-center gap-2 rounded-lg border border-primary-600 px-4 py-2.5 font-medium text-primary-600 hover:bg-primary-50 dark:border-primary-400 dark:text-primary-400 dark:hover:bg-primary-900/20"
          >
            <Plus className="h-5 w-5" />
            Add Show
          </Link>
        </div>
      </div>

      {/* ── Section tabs: Movies / Shows ─────────────────────────────────── */}
      <div
        role="tablist"
        aria-label="Content type"
        className="flex gap-1 border-b border-slate-200 dark:border-slate-700"
      >
        {SECTIONS.map((s) => (
          <button
            key={s.key}
            role="tab"
            type="button"
            aria-selected={section === s.key}
            onClick={() => switchSection(s.key)}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
              section === s.key
                ? "border-primary-600 text-primary-600 dark:border-primary-400 dark:text-primary-400"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* ── Status filter + search ───────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex flex-wrap gap-2">
          {(["all", ...STATUS_FILTERS] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setStatus(s);
                resetPaging();
              }}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                status === s
                  ? "bg-primary-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
              }`}
            >
              {s === "all" ? "All" : STATUS_LABELS[s]}
            </button>
          ))}
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder={isMovies ? "Search movies..." : "Search shows..."}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              resetPaging();
            }}
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-4 text-slate-900 placeholder-slate-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        {isLoading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
          </div>
        ) : isError ? (
          <div className="py-12 text-center text-red-600 dark:text-red-400">
            {(error as any)?.response?.data?.message ?? (error as Error)?.message ?? "Failed to load content"}
          </div>
        ) : items.length === 0 ? (
          <div className="py-12 text-center text-slate-500 dark:text-slate-400">
            {status === "all"
              ? `No ${isMovies ? "movies" : "shows"} found`
              : `No ${STATUS_LABELS[status].toLowerCase()} ${isMovies ? "movies" : "shows"} found`}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-700/50">
                  <th className={thCls}>Title</th>
                  <th className={thCls}>Year</th>
                  <th className={thCls}>{isMovies ? "Duration" : "Seasons"}</th>
                  {!isMovies && <th className={thCls}>Episodes</th>}
                  <th className={thCls}>Status</th>
                  <th className={thCls}>Featured</th>
                  <th className={`${thCls} text-right`}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-slate-100 dark:border-slate-700">
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                      {item.title}
                    </td>
                    <td className={tdCls}>{releaseYearOf(item)}</td>
                    <td className={tdCls}>
                      {isMovies
                        ? item.duration_minutes
                          ? `${item.duration_minutes} min`
                          : "—"
                        : (item.season_count ?? item.seasons ?? 0)}
                    </td>
                    {!isMovies && (
                      <td className={tdCls}>{item.episode_count ?? item.episodes ?? 0}</td>
                    )}
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass(item.status)}`}
                      >
                        {STATUS_LABELS[item.status] ?? item.status ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {item.is_featured ? (
                        <Star className="h-4 w-4 fill-amber-400 text-amber-500" />
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Link
                          to={
                            isMovies
                              ? `/content/movies/${item.id}`
                              : `/content/shows/${item.id}`
                          }
                          aria-label={`Edit ${item.title}`}
                          className="rounded p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                        <button
                          type="button"
                          aria-label={`Delete ${item.title}`}
                          onClick={() => setPendingDelete({ id: item.id, title: item.title })}
                          className="rounded p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {totalPages > 1 && (
          <div className="flex justify-end border-t border-slate-200 p-4 dark:border-slate-700">
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              disabled={isLoading}
            />
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!pendingDelete}
        title={isMovies ? "Delete movie" : "Delete show"}
        message={`"${pendingDelete?.title ?? ""}" will be permanently removed. This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => pendingDelete && deleteMutation.mutate(pendingDelete.id)}
        onCancel={() => setPendingDelete(null)}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}

/** Movies carry `release_date`; shows carry `release_year`. */
function releaseYearOf(item: any): string {
  if (item.release_year) return String(item.release_year);
  if (item.release_date) {
    const year = new Date(item.release_date).getFullYear();
    if (!Number.isNaN(year)) return String(year);
  }
  return "—";
}

const thCls =
  "px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100";
const tdCls = "px-4 py-3 text-slate-600 dark:text-slate-400";
