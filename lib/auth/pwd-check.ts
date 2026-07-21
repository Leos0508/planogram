/** How often JWT refreshes re-check `User.passwordChangedAt` in Postgres. */
export const PWD_CHECK_INTERVAL_MS = 60_000;

export type PwdCheckDecision =
  | { action: "skip" }
  | { action: "check" };

/**
 * Decide whether this JWT refresh should hit Postgres for passwordChangedAt.
 * Sign-in always checks (caller stamps fresh claims). Refresh skips within the
 * throttle window; after the window we re-check so revocation still applies.
 */
export function shouldCheckPasswordChangedAt(input: {
  nowMs: number;
  pwdCheckedAt: number | undefined;
  intervalMs?: number;
}): PwdCheckDecision {
  const interval = input.intervalMs ?? PWD_CHECK_INTERVAL_MS;
  const last =
    typeof input.pwdCheckedAt === "number" && Number.isFinite(input.pwdCheckedAt)
      ? input.pwdCheckedAt
      : 0;
  if (last > 0 && input.nowMs - last < interval) {
    return { action: "skip" };
  }
  return { action: "check" };
}
