/** @deprecated Use `BackendContentStatus` from `src/lib/contentStatus.ts`. */
export type ShowStatus = "draft" | "pending" | "approved" | "rejected";

export interface CastMember {
  id: string; // for internal UI tracking
  name: string;
  character: string;
  role: string;
  actorImage?: File | null;
}

export interface Episode {
  id: string;
  episodeNumber: number;
  title: string;
  description: string;
  duration: number;
  thumbnail?: File | null;
  videoFile?: File | null;
}

export interface Season {
  id: string;
  seasonNumber: number;
  title: string;
  description: string;
  episodes: Episode[];
}

export interface ShowFormData {
  // Basic Information
  title: string;
  description: string;
  categoryId: string;
  ageRating: string;
  releaseYear: string;

  // Production Information
  directorName: string;
  producerName: string;
  /** users.id of a user with user_type='filmmaker'. Maps to `filmmaker_id`. */
  filmmakerId: string;

  // Media — all sent as multipart files; attachShowMediaUploads writes the
  // resulting *_url columns server-side.
  poster?: File | null;
  backdrop?: File | null;
  thumbnail?: File | null;
  trailer?: File | null;
  durationMinutes: string;

  // Cast
  cast: CastMember[];

  // Seasons
  seasons: Season[];
}

/*
 * Removed, with reasons (verified against schema.sql + Series model + Joi):
 *
 *   accessType  -> `series.access_type` is a real column, but it is absent from
 *                  showValidation.create/update, from Series.create()'s
 *                  destructure and from Series.update()'s whitelist. No endpoint
 *                  can write it; every show takes the DB default.
 *   price       -> there is no show-level price. `content_pricing` keys on
 *                  movie_id or episode_id only — there is no series_id column,
 *                  so show pricing is per-episode, not per-show.
 *   isFeatured  -> the `series` table has NO is_featured column at all. (The
 *                  `movies` table does; series does not.)
 */
