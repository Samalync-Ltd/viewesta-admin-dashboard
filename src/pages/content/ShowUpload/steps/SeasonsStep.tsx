import React, { useState } from "react";
import type { StepProps } from "./types";
import { FormInput } from "../../../../components/ui/forms/FormInput";
import { FormTextarea } from "../../../../components/ui/forms/FormTextarea";
import { MediaUpload } from "../../../../components/ui/forms/MediaUpload";
import type { Season, Episode } from "../../../../types/show";
import { Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";

export function SeasonsStep({ data, updateData, onNext, onBack }: StepProps) {
  const [expandedSeasons, setExpandedSeasons] = useState<string[]>([]);
  const [expandedEpisodes, setExpandedEpisodes] = useState<string[]>([]);

  const toggleSeason = (seasonId: string) => {
    setExpandedSeasons((prev) =>
      prev.includes(seasonId) ? prev.filter((id) => id !== seasonId) : [...prev, seasonId]
    );
  };

  const toggleEpisode = (episodeId: string) => {
    setExpandedEpisodes((prev) =>
      prev.includes(episodeId) ? prev.filter((id) => id !== episodeId) : [...prev, episodeId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onNext) onNext();
  };

  const addSeason = () => {
    const newSeason: Season = {
      id: crypto.randomUUID(),
      seasonNumber: data.seasons.length + 1,
      title: "",
      description: "",
      episodes: [],
    };
    updateData({ seasons: [...data.seasons, newSeason] });
    setExpandedSeasons((prev) => [...prev, newSeason.id]);
  };

  const updateSeason = (index: number, updates: Partial<Season>) => {
    const newSeasons = [...data.seasons];
    newSeasons[index] = { ...newSeasons[index], ...updates };
    updateData({ seasons: newSeasons });
  };

  const removeSeason = (index: number) => {
    const newSeasons = [...data.seasons];
    newSeasons.splice(index, 1);
    // Re-number seasons
    newSeasons.forEach((s, idx) => { s.seasonNumber = idx + 1; });
    updateData({ seasons: newSeasons });
  };

  const addEpisode = (seasonIndex: number) => {
    const season = data.seasons[seasonIndex];
    const newEpisode: Episode = {
      id: crypto.randomUUID(),
      episodeNumber: season.episodes.length + 1,
      title: "",
      description: "",
      duration: 0,
    };
    updateSeason(seasonIndex, { episodes: [...season.episodes, newEpisode] });
    setExpandedEpisodes((prev) => [...prev, newEpisode.id]);
  };

  const updateEpisode = (seasonIndex: number, episodeIndex: number, updates: Partial<Episode>) => {
    const season = data.seasons[seasonIndex];
    const newEpisodes = [...season.episodes];
    newEpisodes[episodeIndex] = { ...newEpisodes[episodeIndex], ...updates };
    updateSeason(seasonIndex, { episodes: newEpisodes });
  };

  const removeEpisode = (seasonIndex: number, episodeIndex: number) => {
    const season = data.seasons[seasonIndex];
    const newEpisodes = [...season.episodes];
    newEpisodes.splice(episodeIndex, 1);
    // Re-number episodes
    newEpisodes.forEach((e, idx) => { e.episodeNumber = idx + 1; });
    updateSeason(seasonIndex, { episodes: newEpisodes });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">
            Seasons & Episodes
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Build the structure of the series.
          </p>
        </div>
        <button
          type="button"
          onClick={addSeason}
          className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          <Plus className="h-4 w-4" /> Add Season
        </button>
      </div>

      <div className="space-y-4">
        {data.seasons.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center dark:border-slate-600 dark:bg-slate-800/50">
            <p className="text-slate-500 dark:text-slate-400">
              No seasons added yet.
            </p>
          </div>
        ) : (
          data.seasons.map((season, sIdx) => (
            <div key={season.id} className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
              <div 
                className="flex cursor-pointer items-center justify-between bg-slate-50 px-4 py-3 dark:bg-slate-800"
                onClick={() => toggleSeason(season.id)}
              >
                <div className="flex items-center gap-3">
                  {expandedSeasons.includes(season.id) ? (
                    <ChevronUp className="h-5 w-5 text-slate-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-slate-400" />
                  )}
                  <h4 className="font-medium text-slate-900 dark:text-slate-100">
                    Season {season.seasonNumber}: {season.title || "Untitled Season"}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removeSeason(sIdx); }}
                  className="text-slate-400 hover:text-red-500 p-1"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {expandedSeasons.includes(season.id) && (
                <div className="border-t border-slate-200 p-4 dark:border-slate-700 space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <FormInput
                        label="Season Title (Optional)"
                        value={season.title}
                        onChange={(e) => updateSeason(sIdx, { title: e.target.value })}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <FormTextarea
                        label="Season Description"
                        rows={2}
                        value={season.description}
                        onChange={(e) => updateSeason(sIdx, { description: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Episodes List */}
                  <div className="space-y-4 rounded-lg bg-slate-50 p-4 dark:bg-slate-900/50">
                    <div className="flex items-center justify-between">
                      <h5 className="font-medium text-slate-900 dark:text-slate-100">Episodes</h5>
                      <button
                        type="button"
                        onClick={() => addEpisode(sIdx)}
                        className="flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700"
                      >
                        <Plus className="h-4 w-4" /> Add Episode
                      </button>
                    </div>

                    <div className="space-y-3">
                      {season.episodes.length === 0 ? (
                        <p className="text-sm text-slate-500 italic">No episodes added to this season.</p>
                      ) : (
                        season.episodes.map((episode, eIdx) => (
                          <div key={episode.id} className="rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
                            <div 
                              className="flex cursor-pointer items-center justify-between px-4 py-3"
                              onClick={() => toggleEpisode(episode.id)}
                            >
                              <div className="flex items-center gap-3">
                                {expandedEpisodes.includes(episode.id) ? (
                                  <ChevronUp className="h-4 w-4 text-slate-400" />
                                ) : (
                                  <ChevronDown className="h-4 w-4 text-slate-400" />
                                )}
                                <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                  Ep {episode.episodeNumber}: {episode.title || "Untitled"}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); removeEpisode(sIdx, eIdx); }}
                                className="text-slate-400 hover:text-red-500 p-1"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>

                            {expandedEpisodes.includes(episode.id) && (
                              <div className="border-t border-slate-200 p-4 dark:border-slate-700 space-y-4">
                                <div className="grid gap-4 sm:grid-cols-2">
                                  <FormInput
                                    label="Episode Title"
                                    required
                                    value={episode.title}
                                    onChange={(e) => updateEpisode(sIdx, eIdx, { title: e.target.value })}
                                  />
                                  <FormInput
                                    label="Duration (minutes)"
                                    type="number"
                                    required
                                    min={0}
                                    value={episode.duration || ""}
                                    onChange={(e) => updateEpisode(sIdx, eIdx, { duration: parseInt(e.target.value) || 0 })}
                                  />
                                  <div className="sm:col-span-2">
                                    <FormTextarea
                                      label="Description"
                                      required
                                      rows={2}
                                      value={episode.description}
                                      onChange={(e) => updateEpisode(sIdx, eIdx, { description: e.target.value })}
                                    />
                                  </div>
                                </div>
                                <div className="grid gap-4 sm:grid-cols-2">
                                  <MediaUpload
                                    label="Thumbnail"
                                    accept="image/*"
                                    value={episode.thumbnail ? [episode.thumbnail] : []}
                                    onChange={(files) => updateEpisode(sIdx, eIdx, { thumbnail: files[0] || null })}
                                  />
                                  <MediaUpload
                                    label="Video File"
                                    accept="video/*"
                                    required
                                    value={episode.videoFile ? [episode.videoFile] : []}
                                    onChange={(files) => updateEpisode(sIdx, eIdx, { videoFile: files[0] || null })}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div className="flex justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg border border-slate-300 bg-white px-6 py-2.5 font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
        >
          Back
        </button>
        <button
          type="submit"
          className="rounded-lg bg-primary-600 px-6 py-2.5 font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        >
          Next Step
        </button>
      </div>
    </form>
  );
}
