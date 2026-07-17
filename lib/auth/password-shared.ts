import { createHash, randomBytes } from "node:crypto";

export const MIN_PASSWORD_LENGTH = 8;

/** VerificationToken.identifier prefix for password-reset tokens. */
export const PASSWORD_RESET_IDENTIFIER_PREFIX = "password-reset:";

export function validateNewPassword(
  password: string,
  confirm: string,
): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (password !== confirm) {
    return "Passwords do not match.";
  }
  return null;
}

export function hashResetToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

export function createRawResetToken(): string {
  return randomBytes(32).toString("hex");
}

export function passwordResetIdentifier(email: string): string {
  return `${PASSWORD_RESET_IDENTIFIER_PREFIX}${email.trim().toLowerCase()}`;
}

export function normalizeAuthEmail(email: string): string {
  return email.trim().toLowerCase();
}
