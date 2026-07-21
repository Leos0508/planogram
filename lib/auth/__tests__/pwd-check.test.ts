import { describe, expect, it } from "vitest";
import {
  PWD_CHECK_INTERVAL_MS,
  shouldCheckPasswordChangedAt,
} from "@/lib/auth/pwd-check";

describe("shouldCheckPasswordChangedAt", () => {
  it("checks when never stamped", () => {
    expect(
      shouldCheckPasswordChangedAt({ nowMs: 100_000, pwdCheckedAt: undefined }),
    ).toEqual({ action: "check" });
  });

  it("skips inside the throttle window", () => {
    const now = 1_000_000;
    expect(
      shouldCheckPasswordChangedAt({
        nowMs: now,
        pwdCheckedAt: now - PWD_CHECK_INTERVAL_MS + 1,
      }),
    ).toEqual({ action: "skip" });
  });

  it("checks when the throttle window elapsed", () => {
    const now = 1_000_000;
    expect(
      shouldCheckPasswordChangedAt({
        nowMs: now,
        pwdCheckedAt: now - PWD_CHECK_INTERVAL_MS,
      }),
    ).toEqual({ action: "check" });
  });
});
