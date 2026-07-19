import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  // SKU Blob uploads allow 2 MB files; multipart FormData needs headroom
  // above the default 1 MB Server Action body limit.
  experimental: {
    serverActions: {
      bodySizeLimit: "3mb",
    },
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  telemetry: false,
  widenClientFileUpload: true,
  sourcemaps: {
    // Skip upload when no auth token (local/CI without Sentry secrets).
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },
});
