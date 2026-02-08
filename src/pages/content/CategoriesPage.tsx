import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Star } from "lucide-react";
import { contentApi } from "../../api/content";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { toast } from "../../components/ui/Toast";

export function CategoriesPage() {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: categoriesData, isLoading } = useQuery({
    queryKey: ["content", "categories"],
    queryFn: () => contentApi.categories.list(),
  });
  const categories = Array.isArray(categoriesData) ? categoriesData : [];

  const deleteMutation = useMutation({
    mutationFn: (id: string) => contentApi.categories.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content", "categories"] });
      setDeleteId(null);
      toast("Category deleted", "success");
    },
    onError: (err: Error) => toast(err.message ?? "Delete failed", "error"),
  });

  const toggleFeaturedMutation = useMutation({
    mutationFn: ({ id, featured }: { id: string; featured: boolean }) =>
      contentApi.categories.update(id, { featured }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content", "categories"] });
      toast("Category updated", "success");
    },
    onError: (err: Error) => toast(err.message ?? "Update failed", "error"),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Categories
          </h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">
            Feature categories on home carousel
          </p>
        </div>
        <a
          href="/content/categories/new"
          className="btn-primary inline-flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          Add Category
        </a>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        {isLoading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
          </div>
        ) : categories.length === 0 ? (
          <div className="py-12 text-center text-slate-500 dark:text-slate-400">
            No categories yet.
          </div>
        ) : (
          <ul className="divide-y divide-slate-200 dark:divide-slate-700">
            {categories.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {c.name}
                  </span>
                  {c.featured && (
                    <Star className="h-4 w-4 fill-amber-400 text-amber-500" />
                  )}
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    {c.movieIds?.length ?? 0} movies
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      toggleFeaturedMutation.mutate({
                        id: c.id,
                        featured: !c.featured,
                      })
                    }
                    className="rounded p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
                    title={c.featured ? "Remove from featured" : "Feature on home"}
                  >
                    <Star
                      className={`h-4 w-4 ${c.featured ? "fill-amber-400 text-amber-500" : ""}`}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteId(c.id)}
                    className="rounded p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteId}
        title="Delete category"
        message="Are you sure?"
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        onCancel={() => setDeleteId(null)}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
