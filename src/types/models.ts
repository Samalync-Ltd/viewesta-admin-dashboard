/**
 * Statuses the backend accepts: "pending" | "approved" | "rejected" | "draft"
 * (movies_status_check / series_status_check, and the Joi validators).
 *
 * @deprecated "published" and "archived" are NOT backend statuses — they exist
 * nowhere in viewesta-backend and are rejected by the DB CHECK constraint.
 * They are retained here only until their removal is signed off; use
 * `BackendContentStatus` from `src/lib/contentStatus.ts` for anything new.
 */
export type ContentStatus =
  | "draft"
  | "approved"
  | "pending"
  | "rejected"
  /** @deprecated not a backend status */
  | "published"
  /** @deprecated not a backend status */
  | "archived";


export interface Movie {
  id: string;
  title: string;
  description: string;
  releaseYear: number;
  duration: number;
  genres: string[];
  language: string;
  ratingVisible: boolean;
  posterUrl?: string;
  backdropUrl?: string;
  trailerUrl?: string;
  streamingUrl?: string;
  tvodPrice?: number;
  includedInSubscription: boolean;
  status: ContentStatus;
  filmmakerIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Genre {
  id: string;
  name: string;
  slug: string;
  movieCount?: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  featured: boolean;
  movieIds: string[];
}

export interface Filmmaker {
  id: string;
  name: string;
  bio?: string;
  avatarUrl?: string;
  followerCount: number;
  movieCount: number;
  enabled: boolean;
  movieIds: string[];
  createdAt: string;
}

export interface User {
  id: string;
  email: string;
  phone?: string;
  name?: string;
  subscriptionStatus?: "active" | "cancelled" | "expired" | "none";
  walletBalance: number;
  blocked: boolean;
  createdAt: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  type: "monthly" | "yearly";
  price: number;
  currency: string;
  enabled: boolean;
  activeCount?: number;
}

export interface Report {
  id: string;
  type: "content" | "playback" | "payment" | "user";
  status: "pending" | "reviewed" | "resolved";
  reporterId: string;
  targetId: string;
  targetType: string;
  description?: string;
  createdAt: string;
}

export interface NotificationPayload {
  title: string;
  body: string;
  target: "all" | "subscribers" | "specific";
  userIds?: string[];
  scheduledAt?: string;
}
