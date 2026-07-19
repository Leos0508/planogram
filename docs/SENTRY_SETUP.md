# Sentry setup (S10 / PLA-74)

Error monitoring via `@sentry/nextjs`. Safe to leave unset locally — the SDK stays disabled without a DSN.

**Ops cutover (Backlog):** [PLA-77](https://linear.app/planogram/issue/PLA-77/complete-sentry-production-setup) — set Production DSN and verify a test error.

## Env

Add to Vercel (Production / Preview as needed) and optionally `.env.local`:

```bash
# Public DSN (client + server). Either name works; prefer NEXT_PUBLIC_ for client.
NEXT_PUBLIC_SENTRY_DSN="https://<key>@o<org>.ingest.sentry.io/<project>"
# Optional alias used by server init
# SENTRY_DSN="https://..."

# Optional source-map upload in CI / Vercel build
# SENTRY_AUTH_TOKEN="sntrys_..."
# SENTRY_ORG="your-org-slug"
# SENTRY_PROJECT="planogram"
```

See `.env.example`.

## Behavior

- **Enabled** only when a DSN is set **and** `NODE_ENV === "production"` (dev stays quiet).
- Captures unhandled client/server errors via `instrumentation.ts`, `instrumentation-client.ts`, and `app/global-error.tsx`.
- Source maps upload only when `SENTRY_AUTH_TOKEN` is present.

## Verify

1. Set `NEXT_PUBLIC_SENTRY_DSN` on a Preview or Production deploy.
2. Trigger a test error (temporary throw in a client component, or use Sentry’s “Send test event”).
3. Confirm the issue appears in the Sentry project.

## Out of scope

Session Replay, high sample-rate tracing, and custom dashboards.
