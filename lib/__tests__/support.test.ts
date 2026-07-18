import { describe, expect, it } from "vitest";
import { getSupportEmail, getSupportMailto } from "@/lib/support";

describe("getSupportEmail", () => {
  it("returns null when unset or invalid", () => {
    delete process.env.SUPPORT_EMAIL;
    expect(getSupportEmail()).toBeNull();
    process.env.SUPPORT_EMAIL = "not-an-email";
    expect(getSupportEmail()).toBeNull();
  });

  it("returns trimmed email", () => {
    process.env.SUPPORT_EMAIL = "  support@example.com  ";
    expect(getSupportEmail()).toBe("support@example.com");
    expect(getSupportMailto()).toBe("mailto:support@example.com");
    delete process.env.SUPPORT_EMAIL;
  });
});
