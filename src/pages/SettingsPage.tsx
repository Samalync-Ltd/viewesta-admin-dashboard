import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Settings, Wrench } from "lucide-react";
import { settingsApi } from "../api/settings";
import type { PlatformSettings } from "../api/settings";
import { toast } from "../components/ui/Toast";

export function SettingsPage() {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery<PlatformSettings>({
    queryKey: ["settings"],
    queryFn: () => settingsApi.get(),
  });

  const updateMutation = useMutation({
    mutationFn: (body: Parameters<typeof settingsApi.update>[0]) =>
      settingsApi.update(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast("Settings saved", "success");
    },
    onError: (err: Error) => toast(err.message ?? "Save failed", "error"),
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const defaultLanguage = (form.elements.namedItem("defaultLanguage") as HTMLInputElement).value;
    updateMutation.mutate({ defaultLanguage });
  };

  if (isLoading && !settings) {
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Platform Settings
        </h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">
          App configuration and legal pages
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="mb-4 flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary-600" />
          <h2 className="font-semibold text-slate-900 dark:text-slate-100">
            General
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="max-w-md space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Default language
            </label>
            <input
              type="text"
              name="defaultLanguage"
              defaultValue={settings?.defaultLanguage ?? "en"}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
            />
          </div>
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            <Wrench className="h-4 w-4" />
            {updateMutation.isPending ? "Saving…" : "Save"}
          </button>
        </form>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h2 className="mb-4 font-semibold text-slate-900 dark:text-slate-100">
          Legal & Help
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Terms URL, Privacy URL, and Contact content are managed via the backend.
          Configure them in your API.
        </p>
      </div>
    </div>
  );
}
