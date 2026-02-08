import { useEffect } from "react";
import { X } from "lucide-react";
import clsx from "clsx";

export type ToastType = "success" | "error" | "info";

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastProps {
  toasts: ToastItem[];
  remove: (id: string) => void;
}

const styles: Record<ToastType, string> = {
  success: "bg-emerald-600 text-white dark:bg-emerald-700",
  error: "bg-red-600 text-white dark:bg-red-700",
  info: "bg-primary-600 text-white dark:bg-primary-700",
};

export function Toast({ toasts, remove }: ToastProps) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <ToastSingle key={t.id} item={t} onClose={() => remove(t.id)} />
      ))}
    </div>
  );
}

function ToastSingle({ item, onClose }: { item: ToastItem; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 5000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div
      className={clsx(
        "flex items-center gap-3 rounded-lg px-4 py-3 shadow-lg",
        styles[item.type]
      )}
    >
      <span className="text-sm font-medium">{item.message}</span>
      <button
        type="button"
        onClick={onClose}
        className="rounded p-1 hover:bg-white/20"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

let toastId = 0;
const listeners: Array<(t: ToastItem) => void> = [];

function emit(item: ToastItem) {
  listeners.forEach((fn) => fn(item));
}

export function toast(message: string, type: ToastType = "info") {
  const id = String(++toastId);
  emit({ id, message, type });
}

export function subscribeToast(fn: (t: ToastItem) => void): () => void {
  listeners.push(fn);
  return () => {
    const i = listeners.indexOf(fn);
    if (i !== -1) listeners.splice(i, 1);
  };
}
