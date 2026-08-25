import React, { useState, useEffect } from "react";
import type { StepProps } from "./types";
import { FormInput } from "../../../../components/ui/forms/FormInput";
import { FormTextarea } from "../../../../components/ui/forms/FormTextarea";
import { FormSelect } from "../../../../components/ui/forms/FormSelect";
import { contentApi } from "../../../../api/content";
import { AGE_RATINGS } from "../../../../lib/contentOptions";

export function BasicInfoStep({ data, updateData, onNext }: StepProps) {
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    // Real category UUIDs — the backend validates category_id as a UUID and
    // then looks it up, so mock/placeholder ids fail with a 400.
    contentApi.categories.list().then(setCategories).catch(console.error);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onNext) onNext();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <FormInput
            label="Show Title"
            required
            value={data.title}
            onChange={(e) => updateData({ title: e.target.value })}
            placeholder="e.g. Breaking Bad"
          />
        </div>
        
        <div className="sm:col-span-2">
          <FormTextarea
            label="Description"
            required
            rows={4}
            value={data.description}
            onChange={(e) => updateData({ description: e.target.value })}
            placeholder="A brief summary of the show..."
          />
        </div>

        <FormSelect
          label="Category"
          required
          value={data.categoryId}
          onChange={(e) => updateData({ categoryId: e.target.value })}
          options={[
            { label: "Select Category", value: "" },
            ...categories.map((c) => ({ label: c.name, value: c.id }))
          ]}
        />

        <FormSelect
          label="Age Rating"
          required
          value={data.ageRating}
          onChange={(e) => updateData({ ageRating: e.target.value })}
          options={[
            { label: "Select Age Rating", value: "" },
            ...AGE_RATINGS.map((r) => ({ label: r, value: r })),
          ]}
        />

        <FormInput
          label="Release Year"
          type="number"
          required
          value={data.releaseYear}
          onChange={(e) => updateData({ releaseYear: e.target.value })}
          placeholder="e.g. 2025"
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
