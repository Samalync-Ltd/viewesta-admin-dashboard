import { useQuery } from "@tanstack/react-query";
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { analyticsApi } from "../api/analytics";
import { Users, CreditCard, Film, DollarSign } from "lucide-react";

const PIE_COLORS = ["#f97316", "#10b981", "#eab308"];

export function OverviewPage() {
  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ["analytics", "overview"],
    queryFn: analyticsApi.getOverview,
  });

  const { data: dailyActivity } = useQuery({
    queryKey: ["analytics", "activity", "daily"],
    queryFn: () => analyticsApi.getDailyActivity(30),
  });

  const { data: revenueByType } = useQuery({
    queryKey: ["analytics", "revenue-by-type"],
    queryFn: analyticsApi.getRevenueByType,
  });

  const safeDailyActivity = Array.isArray(dailyActivity) ? dailyActivity : [];
  const pieData =
    revenueByType && typeof revenueByType === "object"
      ? [
          { name: "Subscription", value: Number(revenueByType.subscription) || 0 },
          { name: "TVOD", value: Number(revenueByType.tvod) || 0 },
        ].filter((d) => d.value > 0)
      : [];

  if (overviewLoading && !overview) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  const metrics = [
    {
      label: "Total Users",
      value: overview?.totalUsers ?? 0,
      icon: Users,
      color: "bg-primary-500",
    },
    {
      label: "Active Subscriptions",
      value: overview?.activeSubscriptions ?? 0,
      icon: CreditCard,
      color: "bg-emerald-500",
    },
    {
      label: "TVOD Purchases",
      value: overview?.tvodPurchases ?? 0,
      icon: Film,
      color: "bg-amber-500",
    },
    {
      label: "Total Revenue",
      value: overview?.totalRevenue != null ? `$${overview.totalRevenue.toLocaleString()}` : "$0",
      icon: DollarSign,
      color: "bg-violet-500",
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Overview
        </h1>
        <p className="mt-1 text-sm text-neutral-400">
          Platform metrics and analytics
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((m) => (
          <div key={m.label} className="card card-hover p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-400">{m.label}</p>
                <p className="mt-1 text-2xl font-bold text-white">{m.value}</p>
              </div>
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${m.color} text-white`}>
                <m.icon className="h-6 w-6" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-4 text-lg font-semibold text-white">Daily Activity</h2>
          <div className="h-64">
            {safeDailyActivity.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={safeDailyActivity}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#71717a" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#71717a" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#18181b",
                      border: "1px solid #27272a",
                      borderRadius: "8px",
                      color: "#fafafa",
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="value"
                    name="Activity"
                    stroke="#f97316"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-neutral-500">No activity data</div>
            )}
          </div>
        </div>

        <div className="card p-5">
          <h2 className="mb-4 text-lg font-semibold text-white">Revenue by Type</h2>
          <div className="h-64">
            {pieData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number) => `$${v.toLocaleString()}`}
                    contentStyle={{
                      backgroundColor: "#18181b",
                      border: "1px solid #27272a",
                      borderRadius: "8px",
                      color: "#fafafa",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-neutral-500">No revenue data</div>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-4 text-lg font-semibold text-white">Most Watched Movies</h2>
          <ul className="space-y-2">
            {(Array.isArray(overview?.topMovies) ? overview.topMovies : []).slice(0, 5).map((m, i) => (
              <li key={m.id} className="flex items-center justify-between rounded-lg bg-neutral-800/50 px-3 py-2">
                <span className="font-medium text-white">{i + 1}. {m.title}</span>
                <span className="text-sm text-neutral-400">{m.views.toLocaleString()} views</span>
              </li>
            ))}
            {(!Array.isArray(overview?.topMovies) || overview.topMovies.length === 0) && (
              <li className="py-4 text-center text-neutral-500">No data</li>
            )}
          </ul>
        </div>

        <div className="card p-5">
          <h2 className="mb-4 text-lg font-semibold text-white">Most Followed Filmmakers</h2>
          <ul className="space-y-2">
            {(Array.isArray(overview?.topFilmmakers) ? overview.topFilmmakers : []).slice(0, 5).map((m, i) => (
              <li key={m.id} className="flex items-center justify-between rounded-lg bg-neutral-800/50 px-3 py-2">
                <span className="font-medium text-white">{i + 1}. {m.name}</span>
                <span className="text-sm text-neutral-400">{m.followers.toLocaleString()} followers</span>
              </li>
            ))}
            {(!Array.isArray(overview?.topFilmmakers) || overview.topFilmmakers.length === 0) && (
              <li className="py-4 text-center text-neutral-500">No data</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
