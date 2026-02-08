import { AlertTriangle, Trash2 } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "default";
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  onConfirm,
  onCancel,
  loading = false,
}: ConfirmDialogProps) {
  if (!open) return null;

  const isDanger = variant === "danger";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="card w-full max-w-sm p-6 shadow-card-hover animate-fade-in">
        <div className="flex items-start gap-4">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${
              isDanger ? "bg-red-500/20" : "bg-primary-500/20"
            }`}
          >
            {isDanger ? (
              <Trash2 className="h-6 w-6 text-red-400" />
            ) : (
              <AlertTriangle className="h-6 w-6 text-primary-400" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-white">{title}</h3>
            <p className="mt-1 text-sm text-neutral-400">{message}</p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={onCancel}
                disabled={loading}
                className="btn-ghost rounded-lg px-4 py-2 text-sm"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={loading}
                className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition disabled:opacity-50 ${
                  isDanger ? "bg-red-600 hover:bg-red-500" : "bg-primary-500 hover:bg-primary-400"
                }`}
              >
                {loading ? "…" : confirmLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
