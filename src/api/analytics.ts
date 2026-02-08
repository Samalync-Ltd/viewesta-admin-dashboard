import { api } from "./client";
import { useMock } from "../config/useMock";
import { mockDb, mockDelay } from "../data/mockDb";

export interface OverviewMetrics {
  totalUsers: number;
  activeSubscriptions: number;
  tvodPurchases: number;
  totalRevenue: number;
  topMovies: { id: string; title: string; views: number }[];
  topFilmmakers: { id: string; name: string; followers: number }[];
}

export interface ActivityPoint {
  date: string;
  value: number;
  label?: string;
}

export const analyticsApi = {
  getOverview: () =>
    useMock
      ? mockDelay(200).then(() => mockDb.getOverview())
      : api.get<OverviewMetrics>("/analytics/overview").then((r) => r.data),
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
