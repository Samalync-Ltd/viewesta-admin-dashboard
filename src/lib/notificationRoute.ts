/**
 * Where a notification opens in the admin dashboard: the movie or show it is
 * about (/content/movies/ID, /content/shows/ID).
 *
 * The backend payload is not fixed: the content id can be in `data` (an object
 * or a JSON string), at the top level, or only in `action_url`, under different
 * key names. Every place is read; the kind comes from the key name, a nested
 * object, the notification type, or the address. Returns null when no id is found.
 */
type Bag = Record<string, unknown>;
interface NotificationLike extends Bag {
  data?: unknown;
  action_url?: string;
}

const present = (v: unknown): v is string | number =>
  v !== undefined && v !== null && typeof v !== "object" && String(v).trim() !== "";

const asObject = (v: unknown): Bag => {
  if (v && typeof v === "object" && !Array.isArray(v)) return v as Bag;
  if (typeof v === "string" && v.trim().startsWith("{")) {
    try {
      const parsed = JSON.parse(v);
      return parsed && typeof parsed === "object" ? (parsed as Bag) : {};
    } catch {
      return {};
    }
  }
  return {};
};

const SERIES_KEY = /^(show|series|tv_?show)(_?id)?$/i;
const MOVIE_KEY = /^(movie|film)(_?id)?$/i;
const GENERIC_KEY = /^(content|target|entity|resource|related|reference|item)_?id$/i;
const SERIES_WORDS = /show|series|episode|season/i;

const page = (kind: "series" | "movie", id: string | number) =>
  `/content/${kind === "series" ? "shows" : "movies"}/${encodeURIComponent(String(id).trim())}`;

function fromAddress(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  let text = raw.trim();
  if (/^https?:\/\//i.test(text)) {
    try {
      const url = new URL(text);
      // Another site's address is never followed; this site's own pages are read for their path.
      if (typeof window !== "undefined" && url.origin !== window.location.origin) return null;
      text = url.pathname;
    } catch {
      return null;
    }
  }
  const path = text.replace(/^[a-z][a-z0-9+.-]*:\/\//i, "/").split(/[?#]/)[0];
  const show = path.match(/(?:^|\/)(?:shows?|series)\/([^/?#]+)\/?$/i);
  if (show) return page("series", decodeURIComponent(show[1]));
  const movie = path.match(/(?:^|\/)(?:movies?|films?)\/([^/?#]+)\/?$/i);
  if (movie) return page("movie", decodeURIComponent(movie[1]));
  return /^\/content\/(movies|shows)\/[^/]+\/?$/.test(path) ? path : null;
}

export function resolveNotificationRoute(notification: NotificationLike | null | undefined): string | null {
  if (!notification || typeof notification !== "object") return null;

  // Everything that can carry ids; `data` is checked first.
  const sources: Bag[] = [
    asObject(notification.data),
    asObject(notification.payload),
    asObject(notification.metadata),
    asObject(notification.meta),
    notification,
  ];
  const typeHint = [
    notification.type,
    notification.notification_type,
    notification.category,
    ...sources.map((s) => s.type),
  ]
    .filter(present)
    .join(" ");

  let generic: string | null = null;
  for (const src of sources) {
    for (const [key, value] of Object.entries(src)) if (present(value) && SERIES_KEY.test(key)) return page("series", value);
    for (const [key, value] of Object.entries(src)) if (present(value) && MOVIE_KEY.test(key)) return page("movie", value);
    for (const [key, value] of Object.entries(src)) {
      const nested = asObject(value);
      if (present(nested.id) && SERIES_KEY.test(key)) return page("series", nested.id);
      if (present(nested.id) && MOVIE_KEY.test(key)) return page("movie", nested.id);
    }
    if (!generic) {
      const k = Object.keys(src).find((key) => GENERIC_KEY.test(key) && present(src[key]));
      if (k) {
        const kindWord = [src.content_type, src.contentType, src.entity_type, src.target_type, src.type, typeHint]
          .filter(present)
          .join(" ");
        generic = page(SERIES_WORDS.test(kindWord) ? "series" : "movie", src[k] as string);
      }
    }
  }
  if (generic) return generic;

  const data = sources[0];
  for (const raw of [data.action_url, data.url, data.link, data.deep_link, notification.action_url, notification.url, notification.link, notification.deep_link]) {
    const found = fromAddress(raw);
    if (found) return found;
  }
  return null;
}
