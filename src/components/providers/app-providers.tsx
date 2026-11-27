"use client";

import * as React from "react";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "light",
  toggleTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant?: "default" | "success" | "error";
}

interface ToastContextValue {
  toast: (item: Omit<ToastItem, "id">) => void;
}

const ToastContext = createContext<ToastContextValue>({
  toast: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const saved = window.localStorage.getItem("spendwise_theme") as Theme | null;
    const preferred = saved ?? "light";
    setTheme(preferred);
    document.documentElement.classList.toggle("dark", preferred === "dark");

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === "light" ? "dark" : "light";
      document.documentElement.classList.toggle("dark", next === "dark");
      window.localStorage.setItem("spendwise_theme", next);
      return next;
    });
  }, []);

  const toast = useCallback((item: Omit<ToastItem, "id">) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev, { ...item, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <ToastContext.Provider value={{ toast }}>
        {children}
        <div
          aria-live="polite"
          className="fixed bottom-20 right-4 z-50 flex max-w-sm flex-col gap-2 md:bottom-4"
        >
          {toasts.map((t) => (
            <div
              key={t.id}
              className="flex items-start gap-3 rounded-xl border bg-card p-3.5 text-card-foreground shadow-lg"
            >
              {t.variant === "success" ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#00B86B]" />
              ) : t.variant === "error" ? (
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#E11D48]" />
              ) : (
                <Info className="mt-0.5 h-5 w-5 shrink-0 text-[#00BAF2]" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{t.title}</p>
                {t.description ? (
                  <p className="mt-0.5 text-xs text-muted-foreground">{t.description}</p>
                ) : null}
              </div>
              <button
                type="button"
                aria-label="Dismiss notification"
                onClick={() => setToasts((prev) => prev.filter((item) => item.id !== t.id))}
                className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </ToastContext.Provider>
    </ThemeContext.Provider>
  );
}
