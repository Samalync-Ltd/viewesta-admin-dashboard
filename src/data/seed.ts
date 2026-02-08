import type {
  Movie,
  Genre,
  Category,
  Filmmaker,
  User,
  SubscriptionPlan,
  Report,
} from "../types/models";
import type { AdminUser } from "../types/auth";

interface OverviewMetrics {
  totalUsers: number;
  activeSubscriptions: number;
  tvodPurchases: number;
  totalRevenue: number;
  topMovies: { id: string; title: string; views: number }[];
  topFilmmakers: { id: string; name: string; followers: number }[];
}
interface ActivityPoint {
  date: string;
  value: number;
  label?: string;
}
interface Subscription {
  id: string;
  userId: string;
  planId: string;
  status: string;
  startDate: string;
  endDate?: string;
}
interface TvodPurchase {
  id: string;
  userId: string;
  movieId: string;
  amount: number;
  createdAt: string;
}
interface WalletTransaction {
  id: string;
  userId: string;
  type: "credit" | "debit" | "refund";
  amount: number;
  balanceAfter?: number;
  createdAt: string;
}

const now = new Date().toISOString();
const day = (d: number) => new Date(Date.now() - d * 86400000).toISOString().slice(0, 10);

export const seedGenres: Genre[] = [
  { id: "g1", name: "Drama", slug: "drama", movieCount: 12 },
  { id: "g2", name: "Comedy", slug: "comedy", movieCount: 8 },
  { id: "g3", name: "Thriller", slug: "thriller", movieCount: 10 },
  { id: "g4", name: "Documentary", slug: "documentary", movieCount: 6 },
  { id: "g5", name: "Romance", slug: "romance", movieCount: 7 },
  { id: "g6", name: "Action", slug: "action", movieCount: 9 },
  { id: "g7", name: "Sci-Fi", slug: "sci-fi", movieCount: 5 },
  { id: "g8", name: "Horror", slug: "horror", movieCount: 4 },
  { id: "g9", name: "Animation", slug: "animation", movieCount: 3 },
  { id: "g10", name: "Crime", slug: "crime", movieCount: 6 },
];

export const seedCategories: Category[] = [
  { id: "c1", name: "Featured", slug: "featured", featured: true, movieIds: ["m1", "m2", "m3"] },
  { id: "c2", name: "New Releases", slug: "new-releases", featured: true, movieIds: ["m4", "m5", "m6"] },
  { id: "c3", name: "Award Winners", slug: "award-winners", featured: false, movieIds: ["m1", "m7"] },
  { id: "c4", name: "Indie Picks", slug: "indie-picks", featured: true, movieIds: ["m8", "m9"] },
];

export const seedFilmmakers: Filmmaker[] = [
  { id: "f1", name: "Ava Okonkwo", bio: "Award-winning director.", followerCount: 12400, movieCount: 4, enabled: true, movieIds: ["m1", "m2"], createdAt: day(90) },
  { id: "f2", name: "Marcus Chen", bio: "Documentary filmmaker.", followerCount: 8900, movieCount: 3, enabled: true, movieIds: ["m3", "m4"], createdAt: day(120) },
  { id: "f3", name: "Sofia Reyes", bio: "Indie drama specialist.", followerCount: 15600, movieCount: 5, enabled: true, movieIds: ["m5", "m6", "m7"], createdAt: day(60) },
  { id: "f4", name: "James Okafor", bio: "Thriller and action.", followerCount: 22100, movieCount: 6, enabled: true, movieIds: ["m8", "m9"], createdAt: day(200) },
  { id: "f5", name: "Yuki Tanaka", bio: "Animation and fantasy.", followerCount: 7800, movieCount: 2, enabled: true, movieIds: ["m10"], createdAt: day(45) },
];

export const seedMovies: Movie[] = [
  { id: "m1", title: "The Last Horizon", description: "A drama about redemption.", releaseYear: 2024, duration: 118, genres: ["g1", "g5"], language: "en", ratingVisible: true, posterUrl: "", backdropUrl: "", trailerUrl: "", streamingUrl: "", tvodPrice: 4.99, includedInSubscription: true, status: "published", filmmakerIds: ["f1"], createdAt: day(30), updatedAt: now },
  { id: "m2", title: "Echoes of Tomorrow", description: "Sci-fi thriller.", releaseYear: 2024, duration: 132, genres: ["g7", "g3"], language: "en", ratingVisible: true, posterUrl: "", backdropUrl: "", trailerUrl: "", streamingUrl: "", tvodPrice: 5.99, includedInSubscription: true, status: "published", filmmakerIds: ["f1"], createdAt: day(45), updatedAt: now },
  { id: "m3", title: "Wild Rivers", description: "Documentary about rivers.", releaseYear: 2023, duration: 92, genres: ["g4"], language: "en", ratingVisible: true, posterUrl: "", backdropUrl: "", trailerUrl: "", streamingUrl: "", tvodPrice: 2.99, includedInSubscription: true, status: "published", filmmakerIds: ["f2"], createdAt: day(60), updatedAt: now },
  { id: "m4", title: "Silent Streets", description: "Crime drama.", releaseYear: 2024, duration: 105, genres: ["g10", "g1"], language: "en", ratingVisible: true, posterUrl: "", backdropUrl: "", trailerUrl: "", streamingUrl: "", tvodPrice: 3.99, includedInSubscription: false, status: "published", filmmakerIds: ["f2"], createdAt: day(20), updatedAt: now },
  { id: "m5", title: "Summer of '99", description: "Coming-of-age romance.", releaseYear: 2023, duration: 98, genres: ["g5", "g2"], language: "en", ratingVisible: true, posterUrl: "", backdropUrl: "", trailerUrl: "", streamingUrl: "", tvodPrice: 4.99, includedInSubscription: true, status: "published", filmmakerIds: ["f3"], createdAt: day(90), updatedAt: now },
  { id: "m6", title: "The Architect", description: "Psychological thriller.", releaseYear: 2024, duration: 127, genres: ["g3", "g1"], language: "en", ratingVisible: true, posterUrl: "", backdropUrl: "", trailerUrl: "", streamingUrl: "", tvodPrice: 5.99, includedInSubscription: true, status: "published", filmmakerIds: ["f3"], createdAt: day(15), updatedAt: now },
  { id: "m7", title: "Broken Glass", description: "Award-winning drama.", releaseYear: 2023, duration: 112, genres: ["g1"], language: "en", ratingVisible: true, posterUrl: "", backdropUrl: "", trailerUrl: "", streamingUrl: "", tvodPrice: 0, includedInSubscription: true, status: "published", filmmakerIds: ["f3"], createdAt: day(120), updatedAt: now },
  { id: "m8", title: "Night Run", description: "Action thriller.", releaseYear: 2024, duration: 108, genres: ["g6", "g3"], language: "en", ratingVisible: true, posterUrl: "", backdropUrl: "", trailerUrl: "", streamingUrl: "", tvodPrice: 4.99, includedInSubscription: true, status: "published", filmmakerIds: ["f4"], createdAt: day(25), updatedAt: now },
  { id: "m9", title: "Red Desert", description: "Survival action.", releaseYear: 2023, duration: 95, genres: ["g6"], language: "en", ratingVisible: true, posterUrl: "", backdropUrl: "", trailerUrl: "", streamingUrl: "", tvodPrice: 3.99, includedInSubscription: false, status: "published", filmmakerIds: ["f4"], createdAt: day(70), updatedAt: now },
  { id: "m10", title: "Stardust", description: "Animated fantasy.", releaseYear: 2024, duration: 88, genres: ["g9", "g7"], language: "en", ratingVisible: true, posterUrl: "", backdropUrl: "", trailerUrl: "", streamingUrl: "", tvodPrice: 4.99, includedInSubscription: true, status: "published", filmmakerIds: ["f5"], createdAt: day(10), updatedAt: now },
];

export const seedUsers: User[] = Array.from({ length: 48 }, (_, i) => ({
  id: `u${i + 1}`,
  email: `user${i + 1}@example.com`,
  phone: i % 3 === 0 ? `+1555${String(i).padStart(6, "0")}` : undefined,
  name: i % 2 === 0 ? `User ${i + 1}` : undefined,
  subscriptionStatus: i % 4 === 0 ? "none" : i % 4 === 1 ? "cancelled" : i % 4 === 2 ? "expired" : "active",
  walletBalance: Math.round((Math.random() * 100 + 10) * 100) / 100,
  blocked: i === 5,
  createdAt: day(365 - i * 7),
}));

export const seedPlans: SubscriptionPlan[] = [
  { id: "p1", name: "Monthly", type: "monthly", price: 9.99, currency: "USD", enabled: true, activeCount: 1240 },
  { id: "p2", name: "Yearly", type: "yearly", price: 89.99, currency: "USD", enabled: true, activeCount: 890 },
];

export const seedSubscriptions: Subscription[] = seedUsers
  .filter((u) => u.subscriptionStatus === "active")
  .slice(0, 30)
  .map((u, i) => ({
    id: `sub${i + 1}`,
    userId: u.id,
    planId: i % 2 === 0 ? "p1" : "p2",
    status: "active",
    startDate: day(30 + i),
    endDate: i % 2 === 0 ? day(-30) : day(-365),
  }));

export const seedTvodPurchases: TvodPurchase[] = [
  { id: "t1", userId: "u1", movieId: "m4", amount: 3.99, createdAt: day(1) },
  { id: "t2", userId: "u2", movieId: "m9", amount: 3.99, createdAt: day(2) },
  { id: "t3", userId: "u3", movieId: "m4", amount: 3.99, createdAt: day(3) },
  ...Array.from({ length: 27 }, (_, i) => ({
    id: `t${i + 4}`,
    userId: `u${(i % 20) + 1}`,
    movieId: ["m4", "m9", "m1", "m2"][i % 4],
    amount: [2.99, 3.99, 4.99, 5.99][i % 4],
    createdAt: day(4 + i),
  })),
];

export const seedWalletTx: WalletTransaction[] = [
  ...seedUsers.slice(0, 20).flatMap((u, i) => [
    { id: `w${i * 2 + 1}`, userId: u.id, type: "credit" as const, amount: 20, balanceAfter: u.walletBalance, createdAt: day(i + 1) },
    { id: `w${i * 2 + 2}`, userId: u.id, type: "debit" as const, amount: 4.99, balanceAfter: u.walletBalance - 4.99, createdAt: day(i) },
  ]),
];

export const seedReports: Report[] = [
  { id: "r1", type: "content", status: "pending", reporterId: "u1", targetId: "m1", targetType: "movie", description: "Inappropriate scene", createdAt: day(2) },
  { id: "r2", type: "user", status: "reviewed", reporterId: "u2", targetId: "u10", targetType: "user", description: "Spam", createdAt: day(5) },
  { id: "r3", type: "playback", status: "resolved", reporterId: "u3", targetId: "m2", targetType: "movie", description: "Buffering", createdAt: day(10) },
  ...Array.from({ length: 17 }, (_, i) => ({
    id: `r${i + 4}`,
    type: ["content", "user", "playback", "payment"][i % 4] as Report["type"],
    status: ["pending", "reviewed", "resolved"][i % 3] as Report["status"],
    reporterId: `u${(i % 15) + 1}`,
    targetId: i % 2 ? `m${(i % 10) + 1}` : `u${(i % 20) + 1}`,
    targetType: i % 2 ? "movie" : "user",
    description: "Report description",
    createdAt: day(15 + i),
  })),
];

export const seedNotifications: { id: string; title: string; body: string; target: string; scheduledAt: string; sentAt?: string; status: string }[] = [
  { id: "n1", title: "New Release", body: "The Last Horizon is now available.", target: "all", scheduledAt: day(5), sentAt: day(5), status: "sent" },
  { id: "n2", title: "Weekly Picks", body: "Check out this week's top picks.", target: "subscribers", scheduledAt: day(2), sentAt: day(2), status: "sent" },
  ...Array.from({ length: 8 }, (_, i) => ({
    id: `n${i + 3}`,
    title: `Notification ${i + 3}`,
    body: "Body text.",
    target: ["all", "subscribers", "specific"][i % 3],
    scheduledAt: day(10 + i),
    sentAt: i % 2 ? day(10 + i) : undefined,
    status: i % 2 ? "sent" : "scheduled",
  })),
];

export const seedOverview: OverviewMetrics = {
  totalUsers: 12540,
  activeSubscriptions: 2130,
  tvodPurchases: 3842,
  totalRevenue: 284560,
  topMovies: [
    { id: "m1", title: "The Last Horizon", views: 12400 },
    { id: "m6", title: "The Architect", views: 9820 },
    { id: "m2", title: "Echoes of Tomorrow", views: 8760 },
    { id: "m8", title: "Night Run", views: 7540 },
    { id: "m5", title: "Summer of '99", views: 6210 },
  ],
  topFilmmakers: [
    { id: "f4", name: "James Okafor", followers: 22100 },
    { id: "f3", name: "Sofia Reyes", followers: 15600 },
    { id: "f1", name: "Ava Okonkwo", followers: 12400 },
    { id: "f2", name: "Marcus Chen", followers: 8900 },
    { id: "f5", name: "Yuki Tanaka", followers: 7800 },
  ],
};

export const seedDailyActivity: ActivityPoint[] = Array.from({ length: 30 }, (_, i) => ({
  date: day(29 - i),
  value: Math.round(800 + Math.random() * 400 + i * 5),
}));

export const seedRevenueByType = { subscription: 198420, tvod: 86140 };

export const seedSettings = {
  maintenanceMode: false,
  defaultLanguage: "en",
  featuredBannerIds: ["b1", "b2"],
  termsUrl: "/terms",
  privacyUrl: "/privacy",
  contactContent: "Contact support at support@viewesta.com",
};

export const seedDownloadRules = {
  maxDownloadsPerUser: 5,
  expirationDays: 30,
  subscriptionRequired: true,
};

export const seedRatings: { movieId: string; movieTitle: string; averageRating: number; count: number; flaggedCount?: number }[] = seedMovies.slice(0, 10).map((m, i) => ({
  movieId: m.id,
  movieTitle: m.title,
  averageRating: 3.5 + Math.random() * 1.5,
  count: 100 + i * 50,
  flaggedCount: i % 4 === 0 ? 2 : 0,
}));

export const seedAdmins: AdminUser[] = [
  { id: "a1", email: "admin@viewesta.com", name: "Super Admin", role: "super_admin" },
  { id: "a2", email: "content@viewesta.com", name: "Content Admin", role: "content_admin" },
  { id: "a3", email: "support@viewesta.com", name: "Support", role: "support" },
];
