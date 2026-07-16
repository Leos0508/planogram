import { describe, expect, it } from "vitest";
import {
  DISPLAY_NAME_MAX_LENGTH,
  normalizeDisplayName,
  validateDisplayName,
  validateWorkspaceName,
  WORKSPACE_NAME_MAX_LENGTH,
} from "../validation";

describe("validateWorkspaceName", () => {
  it("requires a non-empty name", () => {
    expect(validateWorkspaceName("")).toBe("Workspace name is required");
    expect(validateWorkspaceName("   ")).toBe("Workspace name is required");
  });

  it("enforces max length", () => {
    expect(
      validateWorkspaceName("a".repeat(WORKSPACE_NAME_MAX_LENGTH + 1)),
    ).toMatch(/at most/);
  });

  it("accepts a valid name", () => {
    expect(validateWorkspaceName("  Acme Retail  ")).toBeNull();
  });
});

describe("validateDisplayName", () => {
  it("allows empty (clears name)", () => {
    expect(validateDisplayName("")).toBeNull();
    expect(validateDisplayName("   ")).toBeNull();
  });

  it("enforces max length", () => {
    expect(validateDisplayName("a".repeat(DISPLAY_NAME_MAX_LENGTH + 1))).toMatch(
      /at most/,
    );
  });

  it("accepts a valid name", () => {
    expect(validateDisplayName("  Bao  ")).toBeNull();
  });
});

describe("normalizeDisplayName", () => {
  it("trims or returns null", () => {
    expect(normalizeDisplayName("  Bao  ")).toBe("Bao");
    expect(normalizeDisplayName("   ")).toBeNull();
  });
});
