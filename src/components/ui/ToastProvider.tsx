import { useEffect, useState, type ReactNode } from "react";
import { Toast, subscribeToast, type ToastItem } from "./Toast";

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    return subscribeToast((item) => setToasts((prev) => [...prev, item]));
  }, []);

  const remove = (id: string) =>
    setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <>
      {children}
      <Toast toasts={toasts} remove={remove} />
    </>
  );
}
