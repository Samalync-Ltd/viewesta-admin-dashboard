import React from "react";
import type { StepProps } from "./types";
import { FormInput } from "../../../../components/ui/forms/FormInput";
import { FormTextarea } from "../../../../components/ui/forms/FormTextarea";
import { FormSelect } from "../../../../components/ui/forms/FormSelect";

export function BasicInfoStep({ data, updateData, onNext }: StepProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onNext) onNext();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <FormInput
            label="Series Title"
            required
            value={data.title}
            onChange={(e) => updateData({ title: e.target.value })}
            placeholder="e.g. Breaking Bad"
          />
        </div>
        
        <div className="sm:col-span-2">
          <FormTextarea
            label="Short Description"
            required
            rows={2}
            value={data.shortDescription}
            onChange={(e) => updateData({ shortDescription: e.target.value })}
            placeholder="A brief summary of the series..."
          />
        </div>

        <div className="sm:col-span-2">
          <FormTextarea
            label="Full Synopsis"
            required
            rows={5}
            value={data.fullSynopsis}
            onChange={(e) => updateData({ fullSynopsis: e.target.value })}
            placeholder="Detailed storyline..."
          />
        </div>

        <FormInput
          label="Language"
          required
          value={data.language}
          onChange={(e) => updateData({ language: e.target.value })}
          placeholder="e.g. English"
        />

        <FormInput
          label="Country"
          required
          value={data.country}
          onChange={(e) => updateData({ country: e.target.value })}
          placeholder="e.g. USA"
        />

        <FormInput
          label="Genre"
          required
          value={data.genre}
          onChange={(e) => updateData({ genre: e.target.value })}
          placeholder="e.g. Drama, Thriller"
        />

        <FormInput
          label="Age Rating"
          required
          value={data.ageRating}
          onChange={(e) => updateData({ ageRating: e.target.value })}
          placeholder="e.g. TV-MA, 18+"
        />

        <FormInput
          label="Release Date"
          type="date"
          required
          value={data.releaseDate}
          onChange={(e) => updateData({ releaseDate: e.target.value })}
        />

        <FormSelect
          label="Status"
          required
          value={data.status}
          onChange={(e) => updateData({ status: e.target.value as any })}
          options={[
            { label: "Draft", value: "draft" },
            { label: "Published", value: "published" },
            { label: "Archived", value: "archived" },
          ]}
        />
      </div>

      <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-700">
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
