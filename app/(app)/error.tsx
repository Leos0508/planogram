"use client";

import { RouteErrorPanel } from "@/components/route-status";
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return <RouteErrorPanel reset={reset} digest={error.digest} />;
}
