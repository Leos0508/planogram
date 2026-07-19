import * as Sentry from "@sentry/nextjs";
import { getSentryDsn, sentryEnabled } from "@/lib/sentry/shared";

Sentry.init({
  dsn: getSentryDsn(),
  enabled: sentryEnabled() && process.env.NODE_ENV === "production",
  tracesSampleRate: 0.1,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
