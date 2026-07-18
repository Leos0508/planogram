/** Support contact for trust surface (PLA-70). */
export function getSupportEmail(): string | null {
  const value = process.env.SUPPORT_EMAIL?.trim();
  if (!value || !value.includes("@")) return null;
  return value;
}

export function getSupportMailto(): string | null {
  const email = getSupportEmail();
  return email ? `mailto:${email}` : null;
}
