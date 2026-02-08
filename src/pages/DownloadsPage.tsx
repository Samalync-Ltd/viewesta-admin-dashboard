import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Download, Settings } from "lucide-react";
import { settingsApi } from "../api/settings";
import { toast } from "../components/ui/Toast";

export function DownloadsPage() {
  const queryClient = useQueryClient();

  const { data: rules, isLoading } = useQuery({
    queryKey: ["settings", "download-rules"],
    queryFn: () => settingsApi.downloadRules.get(),
  });

  const updateMutation = useMutation({
    mutationFn: (body: Parameters<typeof settingsApi.downloadRules.update>[0]) =>
      settingsApi.downloadRules.update(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings", "download-rules"] });
      toast("Download rules updated", "success");
    },
    onError: (err: Error) => toast(err.message ?? "Update failed", "error"),
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const maxDownloads = Number((form.elements.namedItem("maxDownloads") as HTMLInputElement).value);
    const expirationDays = Number((form.elements.namedItem("expirationDays") as HTMLInputElement).value);
    const subscriptionRequired = (form.elements.namedItem("subscriptionRequired") as HTMLInputElement).checked;
    updateMutation.mutate({
      maxDownloadsPerUser: maxDownloads,
      expirationDays,
      subscriptionRequired,
    });
  };

  if (isLoading && !rules) {
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
          Downloads & DRM
        </h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">
          Define download rules and offline viewing
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="mb-4 flex items-center gap-2">
          <Download className="h-5 w-5 text-primary-600" />
          <h2 className="font-semibold text-slate-900 dark:text-slate-100">
            Download Rules
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="max-w-md space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Max downloads per user
            </label>
            <input
              type="number"
              name="maxDownloads"
              min={0}
              defaultValue={rules?.maxDownloadsPerUser ?? 5}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Expiration (days)
            </label>
            <input
              type="number"
              name="expirationDays"
              min={1}
              defaultValue={rules?.expirationDays ?? 30}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              name="subscriptionRequired"
              id="subscriptionRequired"
              defaultChecked={rules?.subscriptionRequired ?? true}
              className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
            />
            <label htmlFor="subscriptionRequired" className="text-sm text-slate-700 dark:text-slate-300">
              Subscription required for downloads
            </label>
          </div>
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            <Settings className="h-4 w-4" />
            {updateMutation.isPending ? "Saving…" : "Save rules"}
          </button>
        </form>
      </div>
    </div>
  );
}
