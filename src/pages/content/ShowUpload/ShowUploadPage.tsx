import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { ShowFormData } from "../../../types/show";
import { BasicInfoStep } from "./steps/BasicInfoStep";
import { ProductionInfoStep } from "./steps/ProductionInfoStep";
import { MediaStep } from "./steps/MediaStep";
import { CastStep } from "./steps/CastStep";
import { ReviewStep } from "./steps/ReviewStep";
import { toast } from "../../../components/ui/Toast";
import { contentApi } from "../../../api/content";
import { uploadApi } from "../../../api/upload";

const initialData: ShowFormData = {
  title: "",
  description: "",
  categoryId: "",
  ageRating: "",
  releaseYear: "",
  directorName: "",
  producerName: "",
  durationMinutes: "",
  cast: [],
};

const STEPS = [
  "Basic Info",
  "Production",
  "Media",
  "Cast",
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
      const seriesPayload = {
        content_type: "series",
        title: formData.title,
        description: formData.description,
        category_id: formData.categoryId,
        age_rating: formData.ageRating,
        release_year: formData.releaseYear ? parseInt(formData.releaseYear.split('-')[0]) : new Date().getFullYear(),
        director_name: formData.directorName,
        producer_name: formData.producerName,
        poster_url: posterUrl,
        backdrop_url: backdropUrl,
        trailer_url: trailerUrl,
        duration_minutes: formData.durationMinutes ? parseInt(formData.durationMinutes) : 45,
        cast: formData.cast.map((c) => ({
          name: c.name,
          character: c.character,
          role: c.role,
        })),
      };

      const seriesResult: any = await contentApi.series.create(seriesPayload);
      const seriesId =
        seriesResult?.id ?? seriesResult?.series?.id ?? seriesResult?.data?.id;

      if (!seriesId) {
        throw new Error("Series created but no ID returned from server.");
      }

      setUploadProgress(100);
      setUploadStatus("Done!");
      toast("Series uploaded successfully!", "success");

      setTimeout(() => {
        navigate("/content/shows");
      }, 1500);
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
