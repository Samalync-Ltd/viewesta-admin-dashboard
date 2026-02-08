/**
 * In-memory mock database. Cloned from seed so mutations don't affect seed.
 * Used when useMock is true (no backend).
 */
import type { PaginatedResponse, ListParams } from "../types/api";
import type { Movie, Genre, Category, Filmmaker, User, SubscriptionPlan, Report } from "../types/models";
import type { OverviewMetrics, ActivityPoint } from "../api/analytics";
import type { Subscription, TvodPurchase, WalletTransaction } from "../api/monetization";
import {
  seedGenres,
  seedCategories,
  seedMovies,
  seedFilmmakers,
  seedUsers,
  seedPlans,
  seedSubscriptions,
  seedTvodPurchases,
  seedWalletTx,
  seedReports,
  seedNotifications,
  seedOverview,
  seedDailyActivity,
  seedRevenueByType,
  seedSettings,
  seedDownloadRules,
  seedRatings,
  seedAdmins,
} from "./seed";

function clone<T>(x: T): T {
  return JSON.parse(JSON.stringify(x));
}

function paginate<T>(arr: T[], params?: ListParams): PaginatedResponse<T> {
  const page = Math.max(1, params?.page ?? 1);
  const limit = Math.min(100, Math.max(1, params?.limit ?? 10));
  const search = (params?.search as string)?.toLowerCase() ?? "";
  let list = search
    ? arr.filter((item: unknown) => JSON.stringify(item).toLowerCase().includes(search))
    : [...arr];
  const total = list.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const start = (page - 1) * limit;
  list = list.slice(start, start + limit);
  return { data: list, total, page, limit, totalPages };
}

class MockDb {
  genres = clone(seedGenres);
  categories = clone(seedCategories);
  movies = clone(seedMovies);
  filmmakers = clone(seedFilmmakers);
  users = clone(seedUsers);
  plans = clone(seedPlans);
  subscriptions = clone(seedSubscriptions);
  tvodPurchases = clone(seedTvodPurchases);
  walletTx = clone(seedWalletTx);
  reports = clone(seedReports);
  notifications = clone(seedNotifications);

  getOverview(): OverviewMetrics {
    return clone(seedOverview);
  }

  getDailyActivity(_days?: number): ActivityPoint[] {
    return clone(seedDailyActivity);
  }

  getMonthlyActivity(_months?: number): ActivityPoint[] {
    return Array.from({ length: 12 }, (_, i) => ({
      date: `${new Date().getFullYear()}-${String(12 - i).padStart(2, "0")}`,
      value: Math.round(24000 + Math.random() * 4000),
    }));
  }

  getRevenueByType() {
    return clone(seedRevenueByType);
  }

  getGenres(): Genre[] {
    return this.genres;
  }

  getMovies(params?: ListParams): PaginatedResponse<Movie> {
    return paginate(this.movies, params);
  }

  getMovie(id: string): Movie | undefined {
    return this.movies.find((m) => m.id === id);
  }

  createMovie(body: Partial<Movie>): Movie {
    const id = `m${Date.now()}`;
    const movie: Movie = {
      id,
      title: body.title ?? "",
      description: body.description ?? "",
      releaseYear: body.releaseYear ?? new Date().getFullYear(),
      duration: body.duration ?? 0,
      genres: body.genres ?? [],
      language: body.language ?? "en",
      ratingVisible: body.ratingVisible ?? true,
      posterUrl: body.posterUrl,
      backdropUrl: body.backdropUrl,
      trailerUrl: body.trailerUrl,
      streamingUrl: body.streamingUrl,
      tvodPrice: body.tvodPrice,
      includedInSubscription: body.includedInSubscription ?? false,
      status: body.status ?? "draft",
      filmmakerIds: body.filmmakerIds ?? [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.movies.push(movie);
    return movie;
  }

  updateMovie(id: string, body: Partial<Movie>): Movie | undefined {
    const i = this.movies.findIndex((m) => m.id === id);
    if (i === -1) return undefined;
    this.movies[i] = { ...this.movies[i], ...body, updatedAt: new Date().toISOString() };
    return this.movies[i];
  }

  deleteMovie(id: string): void {
    this.movies = this.movies.filter((m) => m.id !== id);
  }

  getCategories(): Category[] {
    return this.categories;
  }

  getFilmmakers(params?: ListParams): PaginatedResponse<Filmmaker> {
    return paginate(this.filmmakers, params);
  }

  getFilmmaker(id: string): Filmmaker | undefined {
    return this.filmmakers.find((f) => f.id === id);
  }

  createFilmmaker(body: Partial<Filmmaker>): Filmmaker {
    const id = `f${Date.now()}`;
    const filmmaker: Filmmaker = {
      id,
      name: body.name ?? "",
      bio: body.bio,
      avatarUrl: body.avatarUrl,
      followerCount: body.followerCount ?? 0,
      movieCount: body.movieCount ?? 0,
      enabled: body.enabled ?? true,
      movieIds: body.movieIds ?? [],
      createdAt: new Date().toISOString(),
    };
    this.filmmakers.push(filmmaker);
    return filmmaker;
  }

  updateFilmmaker(id: string, body: Partial<Filmmaker>): Filmmaker | undefined {
    const i = this.filmmakers.findIndex((f) => f.id === id);
    if (i === -1) return undefined;
    this.filmmakers[i] = { ...this.filmmakers[i], ...body };
    return this.filmmakers[i];
  }

  deleteFilmmaker(id: string): void {
    this.filmmakers = this.filmmakers.filter((f) => f.id !== id);
  }

  getUsers(params?: ListParams): PaginatedResponse<User> {
    return paginate(this.users, params);
  }

  getUser(id: string): User | undefined {
    return this.users.find((u) => u.id === id);
  }

  getPlans(): SubscriptionPlan[] {
    return this.plans;
  }

  getSubscriptions(params?: ListParams): PaginatedResponse<Subscription> {
    return paginate(this.subscriptions, params);
  }

  getTvodPurchases(params?: ListParams): PaginatedResponse<TvodPurchase> {
    return paginate(this.tvodPurchases, params);
  }

  getWalletTransactions(params?: ListParams): PaginatedResponse<WalletTransaction> {
    return paginate(this.walletTx, params);
  }

  getReports(params?: ListParams): PaginatedResponse<Report> {
    let list = [...this.reports];
    const status = params?.status as string | undefined;
    if (status) list = list.filter((r) => r.status === status);
    return paginate(list, { ...params, search: undefined });
  }

  getReport(id: string): Report | undefined {
    return this.reports.find((r) => r.id === id);
  }

  getNotifications(): { data: typeof seedNotifications; total: number } {
    return { data: this.notifications, total: this.notifications.length };
  }

  getSettings() {
    return clone(this.settings);
  }

  getDownloadRules() {
    return clone(this.downloadRules);
  }

  getRatings(params?: ListParams): { data: typeof seedRatings; total: number } {
    const list = params?.search
      ? seedRatings.filter((r) => r.movieTitle.toLowerCase().includes((params.search as string).toLowerCase()))
      : seedRatings;
    const p = paginate(list, params);
    return { data: p.data, total: p.total };
  }

  getAdmins() {
    return clone(seedAdmins);
  }

  createGenre(body: { name: string; slug?: string }): Genre {
    const id = `g${Date.now()}`;
    const slug = body.slug ?? body.name.toLowerCase().replace(/\s+/g, "-");
    const genre: Genre = { id, name: body.name, slug, movieCount: 0 };
    this.genres.push(genre);
    return genre;
  }

  updateGenre(id: string, body: Partial<Genre>): Genre | undefined {
    const i = this.genres.findIndex((g) => g.id === id);
    if (i === -1) return undefined;
    this.genres[i] = { ...this.genres[i], ...body };
    return this.genres[i];
  }

  deleteGenre(id: string): void {
    this.genres = this.genres.filter((g) => g.id !== id);
  }

  updateCategory(id: string, body: Partial<Category>): Category | undefined {
    const i = this.categories.findIndex((c) => c.id === id);
    if (i === -1) return undefined;
    this.categories[i] = { ...this.categories[i], ...body };
    return this.categories[i];
  }

  blockUser(id: string): void {
    const u = this.users.find((x) => x.id === id);
    if (u) u.blocked = true;
  }

  unblockUser(id: string): void {
    const u = this.users.find((x) => x.id === id);
    if (u) u.blocked = false;
  }

  settings = clone(seedSettings);
  downloadRules = clone(seedDownloadRules);

  updateSettings(body: Partial<typeof seedSettings>): void {
    Object.assign(this.settings, body);
  }

  updateDownloadRules(body: Partial<typeof seedDownloadRules>): void {
    Object.assign(this.downloadRules, body);
  }
}

export const mockDb = new MockDb();

/** Simulate network delay (ms). */
export const mockDelay = (ms = 300) => new Promise((r) => setTimeout(r, ms));
