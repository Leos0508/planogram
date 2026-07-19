/** Shared Sentry init options — no-op when DSN is unset. */
export function getSentryDsn(): string | undefined {
  return (
    process.env.SENTRY_DSN?.trim() ||
    process.env.NEXT_PUBLIC_SENTRY_DSN?.trim() ||
    undefined
  );
}

export function sentryEnabled(): boolean {
  return Boolean(getSentryDsn());
}
