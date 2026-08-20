import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { ShowFormData } from "../../../types/show";
import { BasicInfoStep } from "./steps/BasicInfoStep";
import { ProductionInfoStep } from "./steps/ProductionInfoStep";
import { MediaStep } from "./steps/MediaStep";
import { CastStep } from "./steps/CastStep";
import { SeasonsStep } from "./steps/SeasonsStep";
import { AccessSettingsStep } from "./steps/AccessSettingsStep";
import { ReviewStep } from "./steps/ReviewStep";
import { toast } from "../../../components/ui/Toast";
import { contentApi } from "../../../api/content";
import { uploadApi } from "../../../api/upload";

const initialData: ShowFormData = {
  title: "",
  shortDescription: "",
  fullSynopsis: "",
  language: "",
  country: "",
  genre: "",
  ageRating: "",
  releaseDate: "",
  status: "published",
  director: "",
  producer: "",
  productionCompany: "",
  gallery: [],
  cast: [],
  seasons: [],
  accessType: "Free",
  isFeatured: false,
};

const STEPS = [
  "Basic Info",
  "Production",
  "Media",
  "Cast",
  "Seasons",
  "Access",
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
    setIsSubmitting(true);
    setUploadProgress(0);
    setUploadStatus("Uploading poster...");

    try {
      // ── Step 1: Upload images via S3 presigned URLs ────────────────────────
      let posterUrl = "";
      let backdropUrl = "";
      let trailerUrl = "";

      if (formData.poster) {
        const res = await uploadApi.uploadFileFlow(formData.poster, "poster", (p) =>
          setUploadProgress(p * 0.1)
        );
        posterUrl = res.fileUrl;
      }

      setUploadStatus("Uploading backdrop...");
      if (formData.backdrop) {
        const res = await uploadApi.uploadFileFlow(formData.backdrop, "backdrop", (p) =>
          setUploadProgress(10 + p * 0.1)
        );
        backdropUrl = res.fileUrl;
      }

      setUploadStatus("Uploading trailer...");
      if (formData.trailer) {
        const res = await uploadApi.uploadFileFlow(formData.trailer, "trailer", (p) =>
          setUploadProgress(20 + p * 0.1)
        );
        trailerUrl = res.fileUrl;
      }

      setUploadProgress(30);
      setUploadStatus("Creating series...");

      // ── Step 2: POST series metadata ───────────────────────────────────────
      const totalEpisodes = formData.seasons.reduce(
        (acc, s) => acc + s.episodes.length,
        0
      );

      const seriesPayload = {
        title: formData.title,
        short_description: formData.shortDescription,
        full_synopsis: formData.fullSynopsis,
        language: formData.language,
        country: formData.country,
        genre: formData.genre,
        age_rating: formData.ageRating,
        release_date: formData.releaseDate,
        status: formData.status,
        director: formData.director,
        producer: formData.producer,
        production_company: formData.productionCompany,
        is_featured: formData.isFeatured,
        access_type: formData.accessType,
        price: formData.price,
        poster_url: posterUrl,
        backdrop_url: backdropUrl,
        trailer_url: trailerUrl,
        cast: formData.cast.map((c) => ({
          actor_name: c.actorName,
          character_name: c.characterName,
          role: c.role,
        })),
        seasons: formData.seasons.map((season) => ({
          season_number: season.seasonNumber,
          title: season.title,
          description: season.description,
          episodes: season.episodes.map((ep) => ({
            episode_number: ep.episodeNumber,
            title: ep.title,
            description: ep.description,
            duration: ep.duration,
          })),
        })),
      };

      const seriesResult: any = await contentApi.series.create(seriesPayload);
      const seriesId =
        seriesResult?.id ?? seriesResult?.series?.id ?? seriesResult?.data?.id;

      if (!seriesId) {
        throw new Error("Series created but no ID returned from server.");
      }

      // ── Step 3: Upload episode videos ──────────────────────────────────────
      let episodesDone = 0;
      const progressPerEpisode = totalEpisodes > 0 ? 70 / totalEpisodes : 0;

      for (const season of formData.seasons) {
        for (const episode of season.episodes) {
          if (episode.videoFile) {
            setUploadStatus(
              `Uploading S${season.seasonNumber}E${episode.episodeNumber}: ${episode.title}...`
            );
            const videoFormData = new FormData();
            videoFormData.append("video", episode.videoFile);
            videoFormData.append("duration_seconds", (episode.duration * 60).toString());

            await contentApi.series.addEpisodeVideo(
              seriesId,
              season.seasonNumber,
              episode.episodeNumber,
              videoFormData,
              (progressEvent: any) => {
                if (progressEvent.total) {
                  const epProgress = Math.round(
                    (progressEvent.loaded * 100) / progressEvent.total
                  );
                  setUploadProgress(
                    30 +
                      episodesDone * progressPerEpisode +
                      (epProgress / 100) * progressPerEpisode
                  );
                }
              }
            );
          }
          episodesDone++;
          setUploadProgress(30 + episodesDone * progressPerEpisode);
        }
      }

      setUploadProgress(100);
      setUploadStatus("Done!");
      toast("Series uploaded successfully!", "success");

      setTimeout(() => {
        navigate("/content/movies");
      }, 600);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err.message ||
        "Upload failed";
      toast(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-20">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Upload Series
        </h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">
          Complete the steps below to upload a new series.
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
          <AccessSettingsStep
            data={formData}
            updateData={(d) => setFormData({ ...formData, ...d })}
            onNext={handleNext}
            onBack={handleBack}
          />
        )}
        {currentStep === 6 && (
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
