/**
 * Where a notification should open in the admin dashboard: the movie or show
 * it is about. Order: the ids in `data` (movie_id / show_id / series_id /
 * content_id with a type), then `action_url`, whose viewer-site paths
 * (/movie/ID, /movies/ID, /shows/ID, /series/ID) are mapped to the matching
 * dashboard pages. Returns null when nothing usable is found.
 */
interface NotificationLike {
  data?: Record<string, unknown>;
  action_url?: string;
}

const pick = (...values: unknown[]): string | undefined => {
  const found = values.find((v) => v !== undefined && v !== null && String(v).trim() !== "");
  return found === undefined ? undefined : String(found).trim();
};

const moviePage = (id: string) => `/content/movies/${encodeURIComponent(id)}`;
const showPage = (id: string) => `/content/shows/${encodeURIComponent(id)}`;

export function resolveNotificationRoute(notification: NotificationLike | null | undefined): string | null {
  const data = notification?.data && typeof notification.data === "object" ? notification.data : {};

  const showId = pick(data.show_id, data.showId, data.series_id, data.seriesId);
  if (showId) return showPage(showId);
  const movieId = pick(data.movie_id, data.movieId);
  if (movieId) return moviePage(movieId);
  const contentId = pick(data.content_id, data.contentId, data.target_id, data.entity_id);
  if (contentId) {
    const kind = (pick(data.content_type, data.contentType, data.entity_type, data.type) ?? "").toLowerCase();
    return /show|series/.test(kind) ? showPage(contentId) : moviePage(contentId);
  }

  const raw = pick(data.action_url, notification?.action_url);
  if (!raw) return null;
  let path: string;
  try {
    const url = new URL(raw, window.location.origin);
    if (url.origin !== window.location.origin) return null;
    path = url.pathname;
  } catch {
    return null;
  }
  const movie = path.match(/^\/(?:movies?|film|films)\/([^/]+)\/?$/);
  if (movie) return moviePage(decodeURIComponent(movie[1]));
  const show = path.match(/^\/(?:shows?|series)\/([^/]+)\/?$/);
  if (show) return showPage(decodeURIComponent(show[1]));
  // Already a dashboard page.
  return /^\/content\/(movies|shows)\/[^/]+\/?$/.test(path) ? path : null;
}
