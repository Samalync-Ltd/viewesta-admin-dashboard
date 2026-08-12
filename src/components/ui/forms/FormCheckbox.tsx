import React from "react";
import { clsx } from "clsx";

interface FormCheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  description?: string;
}

export function FormCheckbox({ label, description, className, ...props }: FormCheckboxProps) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-6 items-center">
        <input
          type="checkbox"
          className={clsx(
            "h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500 disabled:opacity-50",
            className
          )}
          {...props}
        />
      </div>
      <div className="text-sm">
        <label htmlFor={props.id} className="font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
          {label}
        </label>
        {description && <p className="text-slate-500 dark:text-slate-400">{description}</p>}
      </div>
    </div>
  );
}
