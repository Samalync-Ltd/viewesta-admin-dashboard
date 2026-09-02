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
  getOverview: (): Promise<OverviewMetrics> =>
    useMock
      ? mockDelay(200).then(() => mockDb.getOverview())
      : api.get("/admin/stats").then((r) => {
          const d = r.data?.data ?? r.data ?? {};
          const num = (v: unknown) => Number(v ?? 0);
          return {
            totalUsers: num(d.users?.total_users ?? d.total_users ?? d.totalUsers),
            activeSubscriptions: num(d.subscriptions?.active_subscriptions ?? d.active_subscriptions ?? d.activeSubscriptions),
            tvodPurchases: num(d.purchases?.total_ppv_purchases ?? d.purchases?.active_ppv_purchases ?? d.tvod_purchases ?? d.tvodPurchases),
            totalRevenue: num(d.revenue?.total_revenue ?? d.total_revenue ?? d.totalRevenue),
            topMovies: (d.most_watched_movies ?? d.top_movies ?? []).map((m: any) => ({
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
