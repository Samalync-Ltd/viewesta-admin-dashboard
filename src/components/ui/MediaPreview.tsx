import { useEffect, useState } from "react";
import { ExternalLink, Play, X, ZoomIn } from "lucide-react";

export interface PreviewSource {
  /** Shown on the switcher when there are several, e.g. "1080p". */
  label: string;
  url: string;
}

/** The media links a movie or show record carries. */
export interface MediaLinks {
  poster_url?: string | null;
  backdrop_url?: string | null;
  thumbnail_url?: string | null;
  trailer_url?: string | null;
  trailer_video?: { file_url?: string | null } | null;
}

export interface PreviewRequest {
  title: string;
  kind: "image" | "video";
  /**
   * Fetches the sources when the preview opens. Video links are signed and
   * short-lived, so they are fetched at that moment rather than on page load.
   */
  load: () => Promise<PreviewSource[]>;
}

function describeError(err: unknown): string {
  const response = (err as { response?: { status?: number; data?: { message?: string } } })?.response;
  if (!response) return (err as Error)?.message || "Could not reach the server.";
  const message = response.data?.message ? ` ${response.data.message}` : "";
  if (response.status === 401 || response.status === 403) {
    return `The server did not allow playing this file (${response.status}).${message}`;
  }
  if (response.status === 404) return `The file was not found (404).${message}`;
  return `Could not load the file (${response.status}).${message}`;
}

export function MediaPreviewModal({ request, onClose }: { request: PreviewRequest; onClose: () => void }) {
  const [sources, setSources] = useState<PreviewSource[] | null>(null);
  const [error, setError] = useState("");
  const [index, setIndex] = useState(0);
  const [mediaFailed, setMediaFailed] = useState(false);

  useEffect(() => {
    let active = true;
    request
      .load()
      .then((list) => { if (active) setSources(list); })
      .catch((err) => { if (active) setError(describeError(err)); });
    return () => { active = false; };
  }, [request]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const current = sources?.[index];
  // The dashboard has no HLS player; a stream playlist is offered as a link instead.
  const isStream = Boolean(current && /\.m3u8(\?|$)/i.test(current.url));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={request.title}
      onClick={onClose}
    >
      <div
        className="flex max-h-full w-full max-w-5xl flex-col gap-3 rounded-xl bg-slate-900 p-4 text-slate-100 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="truncate text-base font-semibold">{request.title}</h2>
          <div className="flex items-center gap-2">
            {current && (
              <a
                href={current.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-lg border border-slate-600 px-3 py-1.5 text-xs hover:bg-slate-800"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Open in new tab
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 hover:bg-slate-800"
              aria-label="Close preview"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {sources && sources.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {sources.map((s, i) => (
              <button
                key={`${s.label}-${i}`}
                type="button"
                onClick={() => { setIndex(i); setMediaFailed(false); }}
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  i === index ? "bg-primary-600 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}

        <div className="flex min-h-[200px] items-center justify-center overflow-auto rounded-lg bg-black">
          {error ? (
            <p className="p-6 text-center text-sm text-red-300">{error}</p>
          ) : !sources ? (
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-500 border-t-transparent" />
          ) : !current ? (
            <p className="p-6 text-center text-sm text-slate-400">
              {request.kind === "video" ? "No video file has been uploaded yet." : "No image has been uploaded yet."}
            </p>
          ) : mediaFailed ? (
            <p className="p-6 text-center text-sm text-red-300">
              The browser could not show this file. The link may have expired: close and open the preview again,
              or use "Open in new tab".
            </p>
          ) : request.kind === "image" ? (
            <img src={current.url} alt={request.title} className="max-h-[75vh] w-auto object-contain" onError={() => setMediaFailed(true)} />
          ) : isStream ? (
            <p className="p-6 text-center text-sm text-slate-300">
              This video is a stream playlist (HLS) that the dashboard cannot play directly. Use "Open in new tab".
            </p>
          ) : (
            <video
              key={current.url}
              src={current.url}
              controls
              autoPlay
              className="max-h-[75vh] w-full"
              onError={() => setMediaFailed(true)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

const buttonCls =
  "inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700";

/** "View full size" / "Play …" button used next to each media field. */
export function PreviewButton({ kind, label, onClick }: { kind: "image" | "video"; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`mt-2 ${buttonCls}`}>
      {kind === "image" ? <ZoomIn className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
      {label}
    </button>
  );
}
