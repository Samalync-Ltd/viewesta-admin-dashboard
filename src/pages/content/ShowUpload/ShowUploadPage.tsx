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

const initialData: ShowFormData = {
  title: "",


  
  shortDescription: "",
  fullSynopsis: "",
  language: "",     
  country: "",
  genre: "",
  ageRating: "",
  releaseDate: "",
  status: "draft",
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
    // Frontend validation in Review Step ensures everything is valid
    // For now, log the payload and simulate upload
    setIsSubmitting(true);
    try {
      console.log("=== SHOW UPLOAD PAYLOAD ===");
      console.log(JSON.stringify(formData, null, 2));
      console.log("=== END PAYLOAD ===");
      
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
      toast("Show payload logged successfully (UI Only)", "success");
      navigate("/"); // Navigate somewhere after success
    } catch {
      toast("Failed to upload show", "error");
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
              <span className={`text-xs font-medium hidden sm:block ${
                idx <= currentStep ? "text-slate-900 dark:text-slate-100" : "text-slate-500"
              }`}>
                {step}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Form Content */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        {currentStep === 0 && (
          <BasicInfoStep data={formData} updateData={(d) => setFormData({ ...formData, ...d })} onNext={handleNext} />
        )}
        {currentStep === 1 && (
          <ProductionInfoStep data={formData} updateData={(d) => setFormData({ ...formData, ...d })} onNext={handleNext} onBack={handleBack} />
        )}
        {currentStep === 2 && (
          <MediaStep data={formData} updateData={(d) => setFormData({ ...formData, ...d })} onNext={handleNext} onBack={handleBack} />
        )}
        {currentStep === 3 && (
          <CastStep data={formData} updateData={(d) => setFormData({ ...formData, ...d })} onNext={handleNext} onBack={handleBack} />
        )}
        {currentStep === 4 && (
          <SeasonsStep data={formData} updateData={(d) => setFormData({ ...formData, ...d })} onNext={handleNext} onBack={handleBack} />
        )}
        {currentStep === 5 && (
          <AccessSettingsStep data={formData} updateData={(d) => setFormData({ ...formData, ...d })} onNext={handleNext} onBack={handleBack} />
        )}
        {currentStep === 6 && (
          <ReviewStep data={formData} onBack={handleBack} onSubmit={handleSubmit} isSubmitting={isSubmitting} />
        )}
      </div>
    </div>
  );
}
