export const PLANOGRAM_NAME_MAX_LENGTH = 120;

export function validatePlanogramName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return "Name is required";
  if (trimmed.length > PLANOGRAM_NAME_MAX_LENGTH) {
    return `Name must be at most ${PLANOGRAM_NAME_MAX_LENGTH} characters`;
  }
  return null;
}
