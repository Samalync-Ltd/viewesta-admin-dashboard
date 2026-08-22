import React from "react";
import type { StepProps } from "./types";
import { MediaUpload } from "../../../../components/ui/forms/MediaUpload";
import { FormInput } from "../../../../components/ui/forms/FormInput";

export function MediaStep({ data, updateData, onNext, onBack }: StepProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onNext) onNext();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">
          Media Uploads
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Upload posters, trailers, and promotional images for the series.
        </p>
      </div>

      <div className="grid gap-8 sm:grid-cols-2">
        <div>
          <MediaUpload
            label="Poster Image"
            required
            accept="image/*"
            value={data.poster ? [data.poster] : []}
            onChange={(files) => updateData({ poster: files[0] || null })}
          />
        </div>
        
        <div>
          <MediaUpload
            label="Backdrop Image"
            required
            accept="image/*"
            value={data.backdrop ? [data.backdrop] : []}
            onChange={(files) => updateData({ backdrop: files[0] || null })}
          />
        </div>

        <div className="sm:col-span-2">
          <MediaUpload
            label="Trailer Video"
            accept="video/*"
            value={data.trailer ? [data.trailer] : []}
            onChange={(files) => updateData({ trailer: files[0] || null })}
          />
        </div>

        <div className="sm:col-span-2">
          <FormInput
            label="Average Episode Duration (Minutes)"
            type="number"
            required
            value={data.durationMinutes}
            onChange={(e) => updateData({ durationMinutes: e.target.value })}
            placeholder="e.g. 45"
          />
        </div>
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
