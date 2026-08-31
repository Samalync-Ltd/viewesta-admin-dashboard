import { useState } from "react";

/** Bundled locally in `public/` — never an external placeholder service. */
export const PLACEHOLDER_MEDIA = "/placeholder-media.svg";

interface Props {
  /** Media URL from the API. May be null/undefined/"" — all render the fallback. */
  src?: string | null;
  alt: string;
  className?: string;
}

/**
 * An <img> that degrades to a local placeholder instead of a broken-image icon.
 *
 * Media fields (poster_url, backdrop_url, trailer_url, …) can come back null,
 * and even a non-null URL can fail to load — the S3 links the API returns are
 * presigned and expire, so a stale one 403s and the browser paints its broken
 * -image glyph. Both cases resolve to the bundled placeholder here: the null
 * check picks up the first, `onError` the second.
 */
export function ImageWithFallback({ src, alt, className }: Props) {
  const [failed, setFailed] = useState(false);
  const resolved = !src || failed ? PLACEHOLDER_MEDIA : src;

  return (
    <img
      src={resolved}
      alt={alt}
      className={className}
      // Guard against a fallback that itself fails: without this, a broken
      // placeholder would re-fire onError against the same src forever.
      onError={() => {
        if (!failed) setFailed(true);
      }}
    />
  );
}
