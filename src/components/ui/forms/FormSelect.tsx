import React from "react";
import { clsx } from "clsx";

interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string | number; label: string }[];
}

export function FormSelect({ label, error, options, className, ...props }: FormSelectProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
          {label} {props.required && <span className="text-red-500">*</span>}
        </label>
      )}
      <select
        className={clsx(
          "w-full rounded-lg border bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 dark:bg-slate-700 dark:text-slate-100",
          error
            ? "border-red-500 focus:border-red-500"
            : "border-slate-300 dark:border-slate-600 focus:border-primary-500",
          className
        )}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
}
