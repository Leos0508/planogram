import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getEmailFromAddress,
  resetResendClientForTests,
  sendEmail,
} from "@/lib/email/send";

describe("getEmailFromAddress", () => {
  afterEach(() => {
    delete process.env.EMAIL_FROM;
    resetResendClientForTests();
  });

  it("throws when EMAIL_FROM is missing", () => {
    delete process.env.EMAIL_FROM;
    expect(() => getEmailFromAddress()).toThrow(/EMAIL_FROM/);
  });

  it("returns trimmed from address", () => {
    process.env.EMAIL_FROM = "  Planogram <noreply@example.com>  ";
    expect(getEmailFromAddress()).toBe("Planogram <noreply@example.com>");
  });
});

describe("sendEmail", () => {
  afterEach(() => {
    delete process.env.RESEND_API_KEY;
    delete process.env.EMAIL_FROM;
    resetResendClientForTests();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("returns clear error when RESEND_API_KEY is missing", async () => {
    delete process.env.RESEND_API_KEY;
    process.env.EMAIL_FROM = "Planogram <noreply@example.com>";
    const result = await sendEmail({
      to: "a@example.com",
      subject: "Hi",
      html: "<p>Hi</p>",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toMatch(/RESEND_API_KEY/);
    }
  });
});
