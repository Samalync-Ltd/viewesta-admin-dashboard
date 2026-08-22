import type { ShowFormData } from "../../../../types/show";
import { CheckCircle2, AlertCircle } from "lucide-react";

interface ReviewStepProps {
  data: ShowFormData;
  onBack: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

export function ReviewStep({ data, onBack, onSubmit, isSubmitting }: ReviewStepProps) {
  // Simple validation checks for required fields
  const missingFields: string[] = [];
  
  if (!data.title) missingFields.push("Series Title");
  if (!data.description) missingFields.push("Description");
  if (!data.poster) missingFields.push("Poster Image");
  if (!data.backdrop) missingFields.push("Backdrop Image");

  const isValid = missingFields.length === 0;

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">
          Review & Submit
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Review the series information before finalizing the upload.
        </p>
      </div>

      {!isValid && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-900/20">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 text-red-500" />
            <div>
              <h4 className="font-medium text-red-800 dark:text-red-300">
                Missing Required Fields
              </h4>
              <ul className="mt-2 list-inside list-disc text-sm text-red-700 dark:text-red-400">
                {missingFields.map((field) => (
                  <li key={field}>{field}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        {/* Summary Cards */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
          <h4 className="mb-4 text-sm font-medium text-slate-900 dark:text-slate-100">Basic Info</h4>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500 dark:text-slate-400">Title</dt>
              <dd className="font-medium text-slate-900 dark:text-slate-100">{data.title || "-"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500 dark:text-slate-400">Age Rating</dt>
              <dd className="font-medium text-slate-900 dark:text-slate-100">{data.ageRating || "-"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500 dark:text-slate-400">Release Year</dt>
              <dd className="font-medium text-slate-900 dark:text-slate-100">{data.releaseYear || "-"}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
          <h4 className="mb-4 text-sm font-medium text-slate-900 dark:text-slate-100">Content Summary</h4>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500 dark:text-slate-400">Director</dt>
              <dd className="font-medium text-slate-900 dark:text-slate-100">{data.directorName || "-"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500 dark:text-slate-400">Producer</dt>
              <dd className="font-medium text-slate-900 dark:text-slate-100">{data.producerName || "-"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500 dark:text-slate-400">Cast Members</dt>
              <dd className="font-medium text-slate-900 dark:text-slate-100">{data.cast.length}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50 sm:col-span-2">
          <h4 className="mb-4 text-sm font-medium text-slate-900 dark:text-slate-100">Media Uploads</h4>
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="flex items-center gap-2 text-sm">
              {data.poster ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <span className="h-4 w-4 rounded-full border border-slate-300 dark:border-slate-600" />}
              <span className="text-slate-700 dark:text-slate-300">Poster</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              {data.backdrop ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <span className="h-4 w-4 rounded-full border border-slate-300 dark:border-slate-600" />}
              <span className="text-slate-700 dark:text-slate-300">Backdrop</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              {data.trailer ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <span className="h-4 w-4 rounded-full border border-slate-300 dark:border-slate-600" />}
              <span className="text-slate-700 dark:text-slate-300">Trailer</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
        <button
          type="button"
          onClick={onBack}
          disabled={isSubmitting}
          className="rounded-lg border border-slate-300 bg-white px-6 py-2.5 font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={!isValid || isSubmitting}
          className="rounded-lg bg-primary-600 px-6 py-2.5 font-medium text-white hover:bg-primary-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        >
          {isSubmitting ? "Uploading..." : "Upload Show"}
        </button>
      </div>
    </div>
  );
}
