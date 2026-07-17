import { describe, expect, it } from "vitest";
import {
  PASSWORD_RESET_IDENTIFIER_PREFIX,
  createRawResetToken,
  hashResetToken,
  passwordResetIdentifier,
  validateNewPassword,
} from "@/lib/auth/password-shared";

describe("validateNewPassword", () => {
  it("rejects short passwords", () => {
    expect(validateNewPassword("short", "short")).toMatch(/at least 8/i);
  });

  it("rejects mismatched confirmation", () => {
    expect(validateNewPassword("longenough", "different1")).toMatch(/match/i);
  });

  it("accepts matching long passwords", () => {
    expect(validateNewPassword("longenough", "longenough")).toBeNull();
  });
});

describe("reset token helpers", () => {
  it("hashes tokens deterministically", () => {
    const raw = "abc123";
    expect(hashResetToken(raw)).toBe(hashResetToken(raw));
    expect(hashResetToken(raw)).not.toBe(raw);
  });

  it("creates unique raw tokens", () => {
    expect(createRawResetToken()).not.toBe(createRawResetToken());
    expect(createRawResetToken().length).toBeGreaterThanOrEqual(32);
  });

  it("builds password-reset identifiers", () => {
    expect(passwordResetIdentifier("  A@Example.COM ")).toBe(
      `${PASSWORD_RESET_IDENTIFIER_PREFIX}a@example.com`,
    );
  });
});
