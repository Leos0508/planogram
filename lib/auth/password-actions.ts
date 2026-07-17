"use server";

import { compare, hash } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { getAppBaseUrl } from "@/lib/billing/stripe";
import { sendEmail } from "@/lib/email/send";
import { prisma } from "@/lib/prisma";
import type { ActionResult } from "@/lib/result";
import { requireWorkspace } from "@/lib/workspaces/current";
import {
  PASSWORD_RESET_IDENTIFIER_PREFIX,
  createRawResetToken,
  hashResetToken,
  normalizeAuthEmail,
  passwordResetIdentifier,
  validateNewPassword,
} from "@/lib/auth/password-shared";

export type AuthFormState = {
  error?: string;
  success?: string;
};

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

/** Delete Auth.js / adapter Session rows (JWT sessions expire on their own). */
async function deleteUserSessions(userId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { userId } });
}

export async function changePassword(input: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<ActionResult<{ ok: true }>> {
  const validation = validateNewPassword(
    input.newPassword,
    input.confirmPassword,
  );
  if (validation) {
    return { ok: false, message: validation };
  }

  try {
    const access = await requireWorkspace();
    if (!access.ok) {
      return { ok: false, message: access.message };
    }

    const user = await prisma.user.findUnique({
      where: { id: access.workspace.user.id },
      select: { id: true, passwordHash: true },
    });

    if (!user?.passwordHash) {
      return {
        ok: false,
        message:
          "Password change is only available for email/password accounts.",
      };
    }

    const currentOk = await compare(input.currentPassword, user.passwordHash);
    if (!currentOk) {
      return { ok: false, message: "Current password is incorrect." };
    }

    const passwordHash = await hash(input.newPassword, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });
    await deleteUserSessions(user.id);

    revalidatePath("/settings/account");
    return { ok: true, data: { ok: true } };
  } catch (error) {
    console.error("[changePassword]", error);
    return { ok: false, message: "Failed to change password." };
  }
}

/**
 * Request a password-reset email. Always returns the same generic success
 * message so callers do not reveal whether the email exists.
 */
export async function requestPasswordReset(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = normalizeAuthEmail(
    typeof formData.get("email") === "string"
      ? (formData.get("email") as string)
      : "",
  );

  const genericSuccess =
    "If an account exists for that email, we sent a reset link.";

  if (!email) {
    return { error: "Email is required." };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, passwordHash: true },
    });

    if (user?.passwordHash) {
      const identifier = passwordResetIdentifier(user.email);
      await prisma.verificationToken.deleteMany({ where: { identifier } });

      const rawToken = createRawResetToken();
      const tokenHash = hashResetToken(rawToken);
      const expires = new Date(Date.now() + RESET_TOKEN_TTL_MS);

      await prisma.verificationToken.create({
        data: {
          identifier,
          token: tokenHash,
          expires,
        },
      });

      const resetUrl = `${getAppBaseUrl()}/reset-password?token=${encodeURIComponent(rawToken)}`;
      const sent = await sendEmail({
        to: user.email,
        subject: "Reset your Planogram password",
        text: `Reset your password: ${resetUrl}\n\nThis link expires in 1 hour.`,
        html: `<p>Reset your Planogram password:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>This link expires in 1 hour. If you did not request this, you can ignore this email.</p>`,
      });

      if (!sent.ok) {
        console.error("[requestPasswordReset] email failed", sent.message);
        return {
          error: sent.message.includes("not configured")
            ? sent.message
            : "Could not send reset email. Try again later.",
        };
      }
    }

    return { success: genericSuccess };
  } catch (error) {
    console.error("[requestPasswordReset]", error);
    return { error: "Could not process reset request. Try again later." };
  }
}

export async function resetPasswordWithToken(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const rawToken =
    typeof formData.get("token") === "string"
      ? (formData.get("token") as string).trim()
      : "";
  const newPassword =
    typeof formData.get("password") === "string"
      ? (formData.get("password") as string)
      : "";
  const confirmPassword =
    typeof formData.get("confirmPassword") === "string"
      ? (formData.get("confirmPassword") as string)
      : "";

  if (!rawToken) {
    return { error: "Reset link is invalid or missing." };
  }

  const validation = validateNewPassword(newPassword, confirmPassword);
  if (validation) {
    return { error: validation };
  }

  try {
    const tokenHash = hashResetToken(rawToken);
    const record = await prisma.verificationToken.findUnique({
      where: { token: tokenHash },
    });

    if (!record || record.expires.getTime() < Date.now()) {
      if (record) {
        await prisma.verificationToken.delete({
          where: { token: tokenHash },
        });
      }
      return { error: "Reset link is invalid or has expired." };
    }

    if (!record.identifier.startsWith(PASSWORD_RESET_IDENTIFIER_PREFIX)) {
      return { error: "Reset link is invalid or has expired." };
    }

    const email = record.identifier.slice(
      PASSWORD_RESET_IDENTIFIER_PREFIX.length,
    );
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, passwordHash: true },
    });

    if (!user?.passwordHash) {
      await prisma.verificationToken.delete({ where: { token: tokenHash } });
      return { error: "Reset link is invalid or has expired." };
    }

    const passwordHash = await hash(newPassword, 12);
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
      }),
      prisma.verificationToken.deleteMany({
        where: { identifier: record.identifier },
      }),
      prisma.session.deleteMany({ where: { userId: user.id } }),
    ]);

    return {
      success: "Password updated. You can sign in with your new password.",
    };
  } catch (error) {
    console.error("[resetPasswordWithToken]", error);
    return { error: "Failed to reset password. Try again later." };
  }
}
