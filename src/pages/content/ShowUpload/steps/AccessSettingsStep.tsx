import React from "react";
import type { StepProps } from "./types";
import { FormSelect } from "../../../../components/ui/forms/FormSelect";
import { FormInput } from "../../../../components/ui/forms/FormInput";
import { FormCheckbox } from "../../../../components/ui/forms/FormCheckbox";

export function AccessSettingsStep({ data, updateData, onNext, onBack }: StepProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onNext) onNext();
  };

  const needsPrice = data.accessType === "PPV" || data.accessType === "PPV + Subscription";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">
          Access & Monetization
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Configure how users can access this series.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <FormSelect
            label="Access Type"
            required
            value={data.accessType}
            onChange={(e) => updateData({ accessType: e.target.value as any })}
            options={[
              { label: "Free (Available to everyone)", value: "Free" },
              { label: "Subscription (Requires active subscription)", value: "Subscription" },
              { label: "PPV (Pay-per-view purchase required)", value: "PPV" },
              { label: "PPV + Subscription (Included in sub, otherwise PPV)", value: "PPV + Subscription" },
            ]}
          />
        </div>

        {needsPrice && (
          <div className="sm:col-span-2">
            <FormInput
              label="PPV Price ($)"
              type="number"
              min={0.01}
              step={0.01}
              required
              value={data.price || ""}
              onChange={(e) => updateData({ price: parseFloat(e.target.value) || undefined })}
              placeholder="e.g. 9.99"
            />
          </div>
        )}

        <div className="sm:col-span-2 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
          <FormCheckbox
            label="Featured Series"
            description="Display this series prominently on the home page."
            checked={data.isFeatured}
            onChange={(e) => updateData({ isFeatured: e.target.checked })}
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
