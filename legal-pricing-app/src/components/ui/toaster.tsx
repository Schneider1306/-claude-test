"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface ToastItem {
  id: number;
  title: string;
  description?: string;
  variant?: "default" | "success" | "warning" | "destructive";
}

interface ToastContextValue {
  toast: (item: Omit<ToastItem, "id">) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast должен использоваться внутри ToastProvider");
  return ctx;
}

const variantClasses: Record<NonNullable<ToastItem["variant"]>, string> = {
  default: "bg-card text-card-foreground border-border",
  success: "bg-success text-success-foreground border-transparent",
  warning: "bg-warning text-warning-foreground border-transparent",
  destructive: "bg-destructive text-destructive-foreground border-transparent",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([]);
  const idRef = React.useRef(0);

  const toast = React.useCallback((item: Omit<ToastItem, "id">) => {
    const id = ++idRef.current;
    setItems((prev) => [...prev, { ...item, id }]);
    setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="no-print fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2">
        {items.map((item) => (
          <div
            key={item.id}
            className={cn(
              "rounded-md border px-4 py-3 shadow-lg text-sm animate-in slide-in-from-bottom-2 fade-in",
              variantClasses[item.variant ?? "default"],
            )}
          >
            <p className="font-medium">{item.title}</p>
            {item.description && <p className="mt-0.5 opacity-90">{item.description}</p>}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
