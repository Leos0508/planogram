import { Resend } from "resend";
import type { ActionResult } from "@/lib/result";

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

let resendClient: Resend | null = null;

function getResend(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    throw new Error("RESEND_API_KEY is not configured.");
  }
  if (!resendClient) {
    resendClient = new Resend(key);
  }
  return resendClient;
}

export function getEmailFromAddress(): string {
  const from = process.env.EMAIL_FROM?.trim();
  if (!from) {
    throw new Error(
      "EMAIL_FROM is not configured (e.g. Planogram <noreply@yourdomain.com>).",
    );
  }
  return from;
}

/**
 * Send a transactional email via Resend.
 * Returns ActionResult so callers can surface a clear message.
 */
export async function sendEmail(
  input: SendEmailInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    const resend = getResend();
    const from = getEmailFromAddress();
    const { data, error } = await resend.emails.send({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });

    if (error) {
      console.error("[sendEmail] Resend error", error);
      return {
        ok: false,
        message: error.message || "Failed to send email.",
      };
    }

    if (!data?.id) {
      console.error("[sendEmail] Resend returned no id", data);
      return { ok: false, message: "Failed to send email." };
    }

    return { ok: true, data: { id: data.id } };
  } catch (error) {
    console.error("[sendEmail]", error);
    const message =
      error instanceof Error && error.message.includes("not configured")
        ? error.message
        : "Failed to send email.";
    return { ok: false, message };
  }
}

/** Reset between tests. */
export function resetResendClientForTests() {
  resendClient = null;
}
