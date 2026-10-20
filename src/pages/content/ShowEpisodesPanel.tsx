import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { contentApi, type ShowEpisode as Episode, type ShowSeason as Season } from "../../api/content";
import { toast } from "../../components/ui/Toast";

const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100";
const labelCls = "mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300";
const NEW_SEASON = "new";

const messageOf = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
  (err as Error)?.message ??
  fallback;

/**
 * The episodes of an existing show, and a form to add another one. An episode
 * goes into a chosen season (or a new season created on the way); its video is
 * optional and can be attached now or later.
 */
export function ShowEpisodesPanel({ showId }: { showId: string }) {
  const queryClient = useQueryClient();
  const [seasonChoice, setSeasonChoice] = useState<string>("");
  const [newSeasonNumber, setNewSeasonNumber] = useState<number | null>(null); // null = the next free number
  const [episodeNumber, setEpisodeNumber] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState(45);
  const [video, setVideo] = useState<File | null>(null);
  const [progress, setProgress] = useState<string>("");

  const seasonsQuery = useQuery({
    queryKey: ["content", "shows", showId, "seasons"],
    queryFn: () => contentApi.shows.seasons(showId),
  });
  const seasons: Season[] = seasonsQuery.data ?? [];

  // Episodes of every season, so the list and the "next number" are always current.
  const episodesQuery = useQuery({
    queryKey: ["content", "shows", showId, "episodes", seasons.map((s) => s.id).join(",")],
    queryFn: async () => {
      const lists = await Promise.all(seasons.map((s) => contentApi.shows.episodes(s.id)));
      return Object.fromEntries(seasons.map((s, i) => [s.id, lists[i]])) as Record<string, Episode[]>;
    },
    enabled: seasons.length > 0,
  });
  const episodesBySeason = episodesQuery.data ?? {};

  // Default to the latest season, or to creating season 1 when there are none.
  const selectedSeason =
    seasonChoice || (seasons.length > 0 ? seasons[seasons.length - 1].id : NEW_SEASON);
  const creatingSeason = selectedSeason === NEW_SEASON;
  const existing = creatingSeason ? [] : episodesBySeason[selectedSeason] ?? [];
  const nextNumber = existing.reduce((max, e) => Math.max(max, Number(e.episode_number) || 0), 0) + 1;
  const numberToUse = episodeNumber ?? nextNumber;
  const nextSeasonNumber = seasons.reduce((max, s) => Math.max(max, s.season_number), 0) + 1;
  const seasonNumberToUse = newSeasonNumber ?? nextSeasonNumber;

  const addMutation = useMutation({
    mutationFn: async () => {
      let seasonId = selectedSeason;
      if (creatingSeason) {
        setProgress("Creating the season…");
        const created = await contentApi.shows.createSeason(showId, { season_number: seasonNumberToUse });
        seasonId = created?.id;
        if (!seasonId) throw new Error("The season was not created.");
      }
      setProgress("Creating the episode…");
      const episode = await contentApi.shows.createEpisode(seasonId, {
        episode_number: numberToUse,
        title: title.trim(),
        description: description.trim() || undefined,
        duration_minutes: duration > 0 ? duration : undefined,
      });
      if (!episode?.id) throw new Error("The episode was not created.");
      if (video) {
        const data = new FormData();
        data.append("video", video);
        data.append("quality", "1080p");
        if (duration > 0) data.append("duration_seconds", String(duration * 60));
        try {
          await contentApi.shows.addEpisodeVideo(episode.id, data, (e: { loaded: number; total?: number }) => {
            if (e.total) setProgress(`Uploading the video ${Math.round((e.loaded / e.total) * 100)}%…`);
          });
        } catch (err) {
          // The episode exists; only its video failed. Say so rather than lose the episode.
          throw new Error(`The episode was added, but its video did not upload: ${messageOf(err, "upload failed")}. You can add the video later.`);
        }
      }
      return episode;
    },
    onSuccess: () => {
      toast("Episode added", "success");
      setTitle("");
      setDescription("");
      setVideo(null);
      setEpisodeNumber(null);
      setNewSeasonNumber(null);
      setSeasonChoice("");
      void queryClient.invalidateQueries({ queryKey: ["content", "shows", showId] });
      void queryClient.invalidateQueries({ queryKey: ["content", "shows"] });
    },
    onError: (err) => {
      toast(messageOf(err, "Could not add the episode"), "error");
      // The episode may exist even though the video failed: refresh the list.
      void queryClient.invalidateQueries({ queryKey: ["content", "shows", showId] });
    },
    onSettled: () => setProgress(""),
  });

  const canSubmit = title.trim().length > 0 && numberToUse >= 1 && (!creatingSeason || seasonNumberToUse >= 1) && !addMutation.isPending;

  return (
    <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Episodes</h2>

      {seasonsQuery.isLoading ? (
        <p className="text-sm text-slate-500">Loading episodes…</p>
      ) : seasonsQuery.isError ? (
        <p className="text-sm text-red-500">Could not load the seasons of this show.</p>
      ) : seasons.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">This show has no seasons yet. Adding an episode below creates the first one.</p>
      ) : (
        <div className="space-y-4">
          {seasons.map((season) => (
            <div key={season.id}>
              <h3 className="mb-1 text-sm font-semibold text-slate-700 dark:text-slate-300">
                {season.title || `Season ${season.season_number}`}
              </h3>
              <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 text-sm dark:divide-slate-700 dark:border-slate-700">
                {(episodesBySeason[season.id] ?? []).length === 0 ? (
                  <li className="px-3 py-2 text-slate-500">No episodes yet</li>
                ) : (
                  (episodesBySeason[season.id] ?? []).map((ep) => (
                    <li key={ep.id} className="flex items-center justify-between gap-3 px-3 py-2">
                      <span className="text-slate-900 dark:text-slate-100">
                        {ep.episode_number}. {ep.title}
                      </span>
                      <span className="text-xs text-slate-500">
                        {ep.duration_minutes ? `${ep.duration_minutes} min` : ""}
                        {" · "}
                        {(ep.video_files?.length ?? 0) > 0 ? "has video" : "no video"}
                      </span>
                    </li>
                  ))
                )}
              </ul>
            </div>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => { e.preventDefault(); if (canSubmit) addMutation.mutate(); }}
        className="space-y-4 border-t border-slate-200 pt-5 dark:border-slate-700"
      >
        <h3 className="font-semibold text-slate-900 dark:text-slate-100">Add an episode</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="ep-season" className={labelCls}>Season</label>
            <select
              id="ep-season"
              value={selectedSeason}
              onChange={(e) => { setSeasonChoice(e.target.value); setEpisodeNumber(null); }}
              className={inputCls}
            >
              {seasons.map((s) => (
                <option key={s.id} value={s.id}>{s.title || `Season ${s.season_number}`}</option>
              ))}
              <option value={NEW_SEASON}>New season…</option>
            </select>
          </div>
          {creatingSeason && (
            <div>
              <label htmlFor="ep-new-season" className={labelCls}>New season number</label>
              <input
                id="ep-new-season" type="number" min={1}
                value={seasonNumberToUse}
                onChange={(e) => setNewSeasonNumber(Number(e.target.value))}
                className={inputCls}
              />
            </div>
          )}
          <div>
            <label htmlFor="ep-number" className={labelCls}>Episode number</label>
            <input
              id="ep-number" type="number" min={1} value={numberToUse}
              onChange={(e) => setEpisodeNumber(Number(e.target.value))}
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="ep-duration" className={labelCls}>Duration (min)</label>
            <input
              id="ep-duration" type="number" min={1} value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className={inputCls}
            />
          </div>
        </div>
        <div>
          <label htmlFor="ep-title" className={labelCls}>Title <span className="text-red-500">*</span></label>
          <input id="ep-title" type="text" required maxLength={255} value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label htmlFor="ep-desc" className={labelCls}>Description</label>
          <textarea id="ep-desc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label htmlFor="ep-video" className={labelCls}>Video file (optional)</label>
          <input id="ep-video" type="file" accept="video/*" onChange={(e) => setVideo(e.target.files?.[0] ?? null)} className="block w-full text-sm text-slate-600 dark:text-slate-300" />
        </div>
        {progress && <p role="status" className="text-sm text-slate-600 dark:text-slate-300">{progress}</p>}
        <button
          type="submit"
          disabled={!canSubmit}
          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 font-medium text-white hover:bg-primary-700 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          {addMutation.isPending ? "Adding…" : "Add episode"}
        </button>
      </form>
    </section>
  );
}
