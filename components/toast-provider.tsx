"use client";

import { cn } from "@/lib/utils";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type ToastKind = "error" | "success";

type ToastMessage = {
  id: string;
  text: string;
  kind: ToastKind;
};

type ToastContextValue = {
  error: (text: string) => void;
  success: (text: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_DURATION_MS = 4500;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  const dismiss = useCallback((id: string) => {
    setMessages((current) => current.filter((message) => message.id !== id));
  }, []);

  const push = useCallback(
    (text: string, kind: ToastKind) => {
      const id = crypto.randomUUID();
      setMessages((current) => [...current, { id, text, kind }]);
      window.setTimeout(() => dismiss(id), TOAST_DURATION_MS);
    },
    [dismiss],
  );

  const error = useCallback((text: string) => push(text, "error"), [push]);
  const success = useCallback((text: string) => push(text, "success"), [push]);

  const value = useMemo(() => ({ error, success }), [error, success]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 left-1/2 z-50 flex w-full max-w-md -translate-x-1/2 flex-col gap-2 px-4"
      >
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "border bg-background px-4 py-3 text-sm shadow-sm",
              message.kind === "error"
                ? "border-destructive/30 text-destructive"
                : "border-border text-foreground",
            )}
            role="alert"
          >
            {message.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}
