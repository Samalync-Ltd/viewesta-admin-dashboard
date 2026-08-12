import React from "react";
import type { StepProps } from "./types";
import { FormInput } from "../../../../components/ui/forms/FormInput";

export function ProductionInfoStep({ data, updateData, onNext, onBack }: StepProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onNext) onNext();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">
          Production Details
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Provide information about the crew and production companies behind this series.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <FormInput
            label="Director(s)"
            required
            value={data.director}
            onChange={(e) => updateData({ director: e.target.value })}
            placeholder="e.g. Vince Gilligan"
          />
        </div>

        <div className="sm:col-span-2">
          <FormInput
            label="Producer(s)"
            required
            value={data.producer}
            onChange={(e) => updateData({ producer: e.target.value })}
            placeholder="e.g. Mark Johnson, Melissa Bernstein"
          />
        </div>

        <div className="sm:col-span-2">
          <FormInput
            label="Production Company"
            required
            value={data.productionCompany}
            onChange={(e) => updateData({ productionCompany: e.target.value })}
            placeholder="e.g. High Bridge Productions"
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
