/**
 * Option lists that must match the backend's Joi validators exactly.
 * Anything outside these lists comes back as a 400 validation error.
 */

/** src/utils/validation.js -> ageRatingSchema */
export const AGE_RATINGS = ["G", "PG", "PG-13", "R", "16+", "18+"] as const;
export type AgeRating = (typeof AGE_RATINGS)[number];

/** videoFileRoutes.js / episodeVideoFileRoutes.js -> quality validator */
export const VIDEO_QUALITIES = ["480p", "720p", "1080p", "4K"] as const;
export type VideoQuality = (typeof VIDEO_QUALITIES)[number];
