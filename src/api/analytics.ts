import { api } from "./client";
import { useMock } from "../config/useMock";
import { mockDb, mockDelay } from "../data/mockDb";

export interface OverviewMetrics {
  totalUsers: number;
  activeSubscriptions: number;
  tvodPurchases: number;
  totalRevenue: number;
  topMovies: { id: string; title: string; views: number }[];
  /**
   * From `top_filmmakers`. `followers` is always 0: the endpoint exposes no
   * follower count (there is no follows data yet), so it ranks by movies and
   * watches instead. Those two are carried through so the panel can show a
   * real figure rather than a column of zeros.
   */
  topFilmmakers: {
    id: string;
    name: string;
    followers: number;
    movieCount?: number;
    watchCount?: number;
  }[];
}

export interface ActivityPoint {
  date: string;
  value: number;
  label?: string;
}

export const analyticsApi = {
  /**
   * GET /analytics/overview.
   *
   * The call already pointed here; what was broken was the parsing. It typed
   * the raw axios body as OverviewMetrics and returned `r.data`, i.e. the
   * whole `{ success, message, data }` envelope. Every field below therefore
   * read as `undefined` off the envelope and the dashboard rendered zeros,
   * even though the server was returning 58 users / 1 subscription / $4.99.
   *
   * The real payload (verified live 2026-08-31) is flat snake_case inside
   * `data`, alongside richer nested blocks:
   *   total_users, active_subscriptions, tvod_purchases, total_revenue,
   *   users{}, subscriptions{}, purchases{}, revenue{}, content{},
   *   most_watched_movies[], top_filmmakers[]
   *
   * Note the filmmaker list is `top_filmmakers`, NOT `most_followed_filmmakers`
   * (that key is absent). It ranks by movie_count / watch_count and carries no
   * follower field at all, so the "followers" figure stays 0 — see the note on
   * OverviewMetrics.topFilmmakers.
   */
  getOverview: (): Promise<OverviewMetrics> =>
    useMock
      ? mockDelay(200).then(() => mockDb.getOverview())
      : api.get("/analytics/overview").then((r) => {
          const d = r.data?.data ?? r.data ?? {};
          const num = (v: unknown) => Number(v ?? 0) || 0;
          return {
            totalUsers: num(d.total_users ?? d.users?.total),
            activeSubscriptions: num(
              d.active_subscriptions ?? d.subscriptions?.active,
            ),
            tvodPurchases: num(d.tvod_purchases ?? d.purchases?.total),
            totalRevenue: num(d.total_revenue ?? d.revenue?.total),
            topMovies: (d.most_watched_movies ?? []).map((m: any) => ({
              id: String(m.id ?? ""),
              title: String(m.title ?? ""),
              views: num(m.watch_count ?? m.views),
            })),
            topFilmmakers: (d.top_filmmakers ?? []).map((f: any) => ({
              id: String(f.id ?? ""),
              name: String(f.name ?? f.username ?? ""),
              followers: num(f.followers ?? f.follower_count),
              movieCount: num(f.movie_count),
              watchCount: num(f.watch_count),
            })),
          } as OverviewMetrics;
        }),
  getDailyActivity: (days?: number) =>
    useMock
      ? mockDelay(150).then(() => mockDb.getDailyActivity(days))
      : api.get<ActivityPoint[]>("/analytics/activity/daily", { params: { days } }).then((r) => r.data),
  getMonthlyActivity: (months?: number) =>
    useMock
      ? mockDelay(150).then(() => mockDb.getMonthlyActivity(months))
      : api.get<ActivityPoint[]>("/analytics/activity/monthly", { params: { months } }).then((r) => r.data),
  getRevenueByType: () =>
    useMock
      ? mockDelay(100).then(() => mockDb.getRevenueByType())
      : api.get<{ subscription: number; tvod: number }>("/analytics/revenue-by-type").then((r) => r.data),
};
