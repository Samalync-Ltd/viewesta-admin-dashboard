import { useParams, useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { store } from "../data/store";

export function WatchScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const movie = id ? store.getMovie(id) : undefined;

  if (!movie) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <p className="text-surface-400">Movie not found</p>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mt-4 text-primary-500"
        >
          Back
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <header className="safe-top absolute left-0 right-0 z-10 flex items-center justify-between p-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
          aria-label="Close"
        >
          <X className="h-6 w-6" />
        </button>
        <span className="text-sm font-medium text-white/90">{movie.title}</span>
        <div className="w-10" />
      </header>
      <div className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-2xl overflow-hidden rounded-xl bg-surface-800">
          <img
            src={movie.backdropUrl ?? movie.posterUrl}
            alt=""
            className="aspect-video w-full object-cover"
          />
          <div className="p-4 text-center">
            <p className="text-surface-400">
              Playback placeholder · API integration will stream video here.
            </p>
            <p className="mt-2 text-sm text-surface-500">
              Progress is saved. Use Back to return.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
