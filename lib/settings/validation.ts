export const WORKSPACE_NAME_MAX_LENGTH = 120;
export const DISPLAY_NAME_MAX_LENGTH = 120;

export function validateWorkspaceName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return "Workspace name is required";
  if (trimmed.length > WORKSPACE_NAME_MAX_LENGTH) {
    return `Workspace name must be at most ${WORKSPACE_NAME_MAX_LENGTH} characters`;
  }
  return null;
}

/** Empty string clears the display name (stored as null). */
export function validateDisplayName(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed.length > DISPLAY_NAME_MAX_LENGTH) {
    return `Display name must be at most ${DISPLAY_NAME_MAX_LENGTH} characters`;
  }
  return null;
}

export function normalizeDisplayName(name: string): string | null {
  const trimmed = name.trim();
  return trimmed.length > 0 ? trimmed : null;
}
