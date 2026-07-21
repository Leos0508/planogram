"use client";

import { RouteErrorPanel } from "@/components/route-status";
import { ThemeProvider } from "@/components/theme-provider";
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import "./globals.css";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="flex min-h-screen flex-col font-sans antialiased">
        <ThemeProvider>
          <div className="flex min-h-screen flex-1 flex-col bg-background text-foreground">
            <RouteErrorPanel reset={reset} digest={error.digest} />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
