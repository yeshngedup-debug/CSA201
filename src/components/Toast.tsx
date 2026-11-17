import { useEffect } from "react";
import type { Toast } from "../types";

export function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  useEffect(() => {
    if (toasts.length === 0) return;
    const timer = setTimeout(() => {
      onDismiss(toasts[toasts.length - 1].id);
    }, 3000);
    return () => clearTimeout(timer);
  }, [toasts, onDismiss]);

  return (
    <div className="fixed bottom-6 right-6 z-70 space-y-2 flex flex-col items-end pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} className={`pointer-events-auto flex items-center gap-2.5 max-w-[min(400px,calc(100vw-40px))] rounded-[10px] px-3.5 py-3 shadow-2xl border text-[12px] font-medium backdrop-blur-md animate-in slide-in-from-bottom-5 fade-in duration-300 ${
          t.type === "success" ? "border-amber-500/30 bg-amber-50 text-gray-900" :
          t.type === "error" ? "border-red-500/30 bg-red-50 text-gray-900" :
          "border-amber-500/30 bg-amber-50 text-gray-900"
        }`}>
          <i className={`bi ${t.type === "success" ? "bi-check2-circle text-[#15803d]" : t.type === "error" ? "bi-x-circle text-[#dc2626]" : "bi-info-circle text-[#7c3aed]"} text-base`} aria-hidden="true" />
          <span>{t.message}</span>
          <button onClick={() => onDismiss(t.id)} className="ml-1 opacity-60 hover:opacity-100 transition-opacity" aria-label="Dismiss">✕</button>
        </div>
      ))}
    </div>
  );
}
