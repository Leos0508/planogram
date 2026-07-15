import { describe, expect, it } from "vitest";
import {
  PLANOGRAM_NAME_MAX_LENGTH,
  validatePlanogramName,
} from "../validation";

describe("validatePlanogramName", () => {
  it("rejects empty or whitespace-only names", () => {
    expect(validatePlanogramName("")).toBe("Name is required");
    expect(validatePlanogramName("   ")).toBe("Name is required");
  });

  it("accepts trimmed names within max length", () => {
    expect(validatePlanogramName("Beverage aisle")).toBeNull();
    expect(validatePlanogramName("  Snack wall  ")).toBeNull();
  });

  it("rejects names over max length", () => {
    const tooLong = "a".repeat(PLANOGRAM_NAME_MAX_LENGTH + 1);
    expect(validatePlanogramName(tooLong)).toBe(
      `Name must be at most ${PLANOGRAM_NAME_MAX_LENGTH} characters`,
    );
  });
});
