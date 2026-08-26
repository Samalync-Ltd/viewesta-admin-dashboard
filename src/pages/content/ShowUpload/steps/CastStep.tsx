import React from "react";
import type { StepProps } from "./types";
import { FormInput } from "../../../../components/ui/forms/FormInput";
import { MediaUpload } from "../../../../components/ui/forms/MediaUpload";
import type { CastMember } from "../../../../types/show";
import { Plus, Trash2 } from "lucide-react";

export function CastStep({ data, updateData, onNext, onBack }: StepProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onNext) onNext();
  };

  const addCastMember = () => {
    const newCast: CastMember = {
      id: crypto.randomUUID(),
      name: "",
      character: "",
      role: "",
    };
    updateData({ cast: [...data.cast, newCast] });
  };

  const updateCastMember = (index: number, updates: Partial<CastMember>) => {
    const newCast = [...data.cast];
    newCast[index] = { ...newCast[index], ...updates };
    updateData({ cast: newCast });
  };

  const removeCastMember = (index: number) => {
    const newCast = [...data.cast];
    newCast.splice(index, 1);
    updateData({ cast: newCast });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">
            Cast Members
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Add actors and their roles for this show.
          </p>
        </div>
        <button
          type="button"
          onClick={addCastMember}
          className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
        >
          <Plus className="h-4 w-4" /> Add Cast Member
        </button>
      </div>

      <div className="space-y-4">
        {data.cast.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center dark:border-slate-600 dark:bg-slate-800/50">
            <p className="text-slate-500 dark:text-slate-400">
              No cast members added yet. Click the button above to add one.
            </p>
          </div>
        ) : (
          data.cast.map((member, idx) => (
            <div
              key={member.id}
              className="relative grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 pt-10 dark:border-slate-700 dark:bg-slate-800/50 sm:grid-cols-2 md:grid-cols-4"
            >
              <button
                type="button"
                onClick={() => removeCastMember(idx)}
                className="absolute right-3 top-3 text-slate-400 hover:text-red-500"
              >
                <Trash2 className="h-5 w-5" />
              </button>

              <div className="md:col-span-1">
                <MediaUpload
                  label="Actor Image"
                  accept="image/*"
                  value={member.actorImage ? [member.actorImage] : []}
                  onChange={(files) => updateCastMember(idx, { actorImage: files[0] || null })}
                />
              </div>

              <div className="space-y-4 md:col-span-3">
                <FormInput
                  label="Actor Name"
                  required
                  value={member.name}
                  onChange={(e) => updateCastMember(idx, { name: e.target.value })}
                  placeholder="e.g. Bryan Cranston"
                />
                <FormInput
                  label="Character Name"
                  required
                  value={member.character}
                  onChange={(e) => updateCastMember(idx, { character: e.target.value })}
                  placeholder="e.g. Walter White"
                />
                <FormInput
                  label="Role"
                  required
                  value={member.role}
                  onChange={(e) => updateCastMember(idx, { role: e.target.value })}
                  placeholder="e.g. Main Cast, Guest Star"
                />
              </div>
            </div>
          ))
        )}
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
