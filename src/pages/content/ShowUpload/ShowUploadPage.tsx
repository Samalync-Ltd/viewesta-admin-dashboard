import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { ShowFormData } from "../../../types/show";
import { BasicInfoStep } from "./steps/BasicInfoStep";
import { ProductionInfoStep } from "./steps/ProductionInfoStep";
import { MediaStep } from "./steps/MediaStep";
import { CastStep } from "./steps/CastStep";
import { SeasonsStep } from "./steps/SeasonsStep";
import { ReviewStep } from "./steps/ReviewStep";
import { toast } from "../../../components/ui/Toast";
import { contentApi } from "../../../api/content";
import { AGE_RATINGS } from "../../../lib/contentOptions";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const initialData: ShowFormData = {
  title: "",
  description: "",
  categoryId: "",
  ageRating: "",
  releaseYear: "",
  directorName: "",
  producerName: "",
  filmmakerId: "",
  durationMinutes: "",
  cast: [],
  seasons: [],
};

const STEPS = [
  "Basic Info",
  "Production",
  "Media",
  "Cast",
  "Seasons",
  "Review",
];

export function ShowUploadPage() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<ShowFormData>(initialData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState("");

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
      window.scrollTo(0, 0);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
      window.scrollTo(0, 0);
    }
  };

  const handleSubmit = async () => {
    // ── Client-side guards for the backend's Joi contract ────────────────────
    // showValidation.create: title 2..255 required, cast required + min(1) with
    // every member carrying name AND role, category_id must be a UUID,
    // age_rating must be one of G/PG/PG-13/R/16+/18+.
    const cast = formData.cast
      .filter((c) => c.name.trim() && c.role.trim())
      .map((c) => ({
        name: c.name.trim(),
        role: c.role.trim(),
        character: c.character.trim(),
      }));

    if (formData.title.trim().length < 2) {
      toast("Title must be at least 2 characters.", "error");
      return;
    }
    if (cast.length === 0) {
      toast("At least one cast member with a name and a role is required.", "error");
      return;
    }
    if (!formData.poster || !formData.backdrop) {
      toast("Poster and backdrop images are required.", "error");
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(0);
    setUploadStatus("Creating show...");

    try {
      // ── Create the show ────────────────────────────────────────────────────
      // POST /shows mounts rejectLegacyMediaFields([...'poster_url',
      // 'backdrop_url','thumbnail_url','trailer_url','trailer_video']), which
      // 400s on any *_url key — even an empty string. Media therefore goes as
      // multipart files, and attachShowMediaUploads writes the URLs server-side.
      const fields: Record<string, unknown> = {
        content_type: "series",
        title: formData.title.trim(),
        cast,
      };

      if (formData.description.trim()) fields.description = formData.description.trim();
      if (formData.directorName.trim()) fields.director_name = formData.directorName.trim();
      if (formData.producerName.trim()) fields.producer_name = formData.producerName.trim();
      if (AGE_RATINGS.includes(formData.ageRating as any)) fields.age_rating = formData.ageRating;
      if (UUID_RE.test(formData.categoryId)) fields.category_id = formData.categoryId;
      // showValidation.create accepts filmmaker_id (movieValidation.create does not).
      if (UUID_RE.test(formData.filmmakerId)) fields.filmmaker_id = formData.filmmakerId;

      const releaseYear = parseInt(String(formData.releaseYear).split("-")[0], 10);
      if (Number.isInteger(releaseYear) && releaseYear >= 1888 && releaseYear <= 2100) {
        fields.release_year = releaseYear;
      }

      const durationMinutes = parseInt(formData.durationMinutes, 10);
      if (Number.isInteger(durationMinutes) && durationMinutes > 0) {
        fields.duration_minutes = durationMinutes;
      }

      const show = await contentApi.shows.create(fields, {
        poster: formData.poster,
        backdrop: formData.backdrop,
        thumbnail: formData.thumbnail,
        trailer: formData.trailer,
      });

      const showId = show?.id;
      if (!showId) throw new Error("Show created but no ID returned from server.");

      setUploadProgress(40);

      // ── Seasons and episodes ───────────────────────────────────────────────
      // POST /shows/:showId/seasons -> POST /seasons/:seasonId/episodes
      // -> POST /episodes/:episodeId/video-files (multipart, field name `video`).
      const seasons = formData.seasons ?? [];
      const totalEpisodes = seasons.reduce((n, s) => n + s.episodes.length, 0);
      let doneEpisodes = 0;

      for (const season of seasons) {
        setUploadStatus(`Creating season ${season.seasonNumber}...`);
        const createdSeason = await contentApi.shows.createSeason(showId, {
          season_number: season.seasonNumber,
          title: season.title || undefined,
          description: season.description || undefined,
        });
        const seasonId = createdSeason?.id;
        if (!seasonId) throw new Error(`Season ${season.seasonNumber} created but no ID returned.`);

        for (const episode of season.episodes) {
          setUploadStatus(
            `Season ${season.seasonNumber} · episode ${episode.episodeNumber}...`
          );
          const createdEpisode = await contentApi.shows.createEpisode(seasonId, {
            episode_number: episode.episodeNumber,
            title: episode.title,
            description: episode.description || undefined,
            duration_minutes: episode.duration > 0 ? episode.duration : undefined,
          });
          const episodeId = createdEpisode?.id;

          if (episodeId && episode.videoFile) {
            const videoData = new FormData();
            videoData.append("video", episode.videoFile);
            videoData.append("quality", "1080p");
            if (episode.duration > 0) {
              videoData.append("duration_seconds", String(episode.duration * 60));
            }
            await contentApi.shows.addEpisodeVideo(episodeId, videoData);
          }

          doneEpisodes += 1;
          if (totalEpisodes > 0) {
            setUploadProgress(40 + Math.round((doneEpisodes / totalEpisodes) * 55));
          }
        }
      }

      setUploadProgress(100);
      setUploadStatus("Done!");
      toast("Show uploaded successfully!", "success");
      navigate("/content/shows");
    } catch (err: any) {
      toast(extractError(err, "Upload failed"), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-20">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Upload Show
        </h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">
          Complete the steps below to upload a new show.
        </p>
      </div>

      {/* Progress Steps */}
      <div className="relative">
        <div className="absolute top-1/2 left-0 w-full -translate-y-1/2 rounded-full h-1 bg-slate-200 dark:bg-slate-700" />
        <div
          className="absolute top-1/2 left-0 h-1 -translate-y-1/2 rounded-full bg-primary-600 transition-all duration-300"
          style={{ width: `${(currentStep / (STEPS.length - 1)) * 100}%` }}
        />
        <div className="relative flex justify-between">
          {STEPS.map((step, idx) => (
            <div key={step} className="flex flex-col items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                  idx <= currentStep
                    ? "bg-primary-600 text-white"
                    : "bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
                }`}
              >
                {idx + 1}
              </div>
              <span
                className={`text-xs font-medium hidden sm:block ${
                  idx <= currentStep
                    ? "text-slate-900 dark:text-slate-100"
                    : "text-slate-500"
                }`}
              >
                {step}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Upload Progress Bar — visible while submitting */}
      {isSubmitting && (
        <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="flex justify-between text-sm">
            <span className="text-slate-700 dark:text-slate-300">{uploadStatus}</span>
            <span className="font-medium text-primary-600">
              {Math.round(uploadProgress)}%
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
            <div
              className="h-full bg-primary-600 transition-all duration-300 ease-out"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Form Content */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        {currentStep === 0 && (
          <BasicInfoStep
            data={formData}
            updateData={(d) => setFormData({ ...formData, ...d })}
            onNext={handleNext}
          />
        )}
        {currentStep === 1 && (
          <ProductionInfoStep
            data={formData}
            updateData={(d) => setFormData({ ...formData, ...d })}
            onNext={handleNext}
            onBack={handleBack}
          />
        )}
        {currentStep === 2 && (
          <MediaStep
            data={formData}
            updateData={(d) => setFormData({ ...formData, ...d })}
            onNext={handleNext}
            onBack={handleBack}
          />
        )}
        {currentStep === 3 && (
          <CastStep
            data={formData}
            updateData={(d) => setFormData({ ...formData, ...d })}
            onNext={handleNext}
            onBack={handleBack}
          />
        )}
        {currentStep === 4 && (
          <SeasonsStep
            data={formData}
            updateData={(d) => setFormData({ ...formData, ...d })}
            onNext={handleNext}
            onBack={handleBack}
          />
        )}
        {currentStep === 5 && (
          <ReviewStep
            data={formData}
            onBack={handleBack}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
          />
        )}
      </div>
    </div>
  );
}

/** Surface the backend's Joi field errors instead of a generic "Upload failed". */
function extractError(err: any, fallback: string): string {
  const data = err?.response?.data;
  const details = data?.error?.details;
  if (Array.isArray(details) && details.length > 0) {
    return details.map((d: any) => `${d.field}: ${d.message}`).join("; ");
  }
  return (
    data?.message ??
    data?.error?.message ??
    (typeof data === "string" ? data : null) ??
    err?.message ??
    fallback
  );
}
