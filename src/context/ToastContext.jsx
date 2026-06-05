"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = "success") => {
    const id = Date.now();
    setToasts((current) => [...current, { id, message, type }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 3200);
  };

  const value = useMemo(() => ({ showToast }), []);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed right-4 top-20 z-50 space-y-2">
        {toasts.map((toast) => {
          const Icon = toast.type === "error" ? XCircle : CheckCircle2;
          return (
            <div key={toast.id} className={`flex min-w-72 items-center gap-3 rounded-lg border bg-white px-4 py-3 text-sm font-semibold shadow-soft dark:bg-stone-900 ${toast.type === "error" ? "border-red-200 text-red-700" : "border-green-200 text-green-700"}`}>
              <Icon className="h-5 w-5" />
              {toast.message}
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
