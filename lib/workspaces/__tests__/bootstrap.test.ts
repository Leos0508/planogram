import { describe, expect, it } from "vitest";
import {
  slugifyWorkspaceName,
  workspaceNameForUser,
} from "../bootstrap";

describe("workspaceNameForUser", () => {
  it("prefers the user's display name", () => {
    expect(
      workspaceNameForUser({ name: "Bao", email: "bao@example.com" }),
    ).toBe("Bao's workspace");
  });

  it("falls back to the email local part", () => {
    expect(
      workspaceNameForUser({ name: null, email: "bao@example.com" }),
    ).toBe("bao's workspace");
  });

  it("uses a generic name when email local part is empty", () => {
    expect(workspaceNameForUser({ name: "  ", email: "@x.com" })).toBe(
      "My workspace",
    );
  });
});

describe("slugifyWorkspaceName", () => {
  it("slugifies names to lowercase kebab-case", () => {
    expect(slugifyWorkspaceName("Bao's workspace")).toBe("bao-s-workspace");
  });

  it("returns null for empty/punctuation-only input", () => {
    expect(slugifyWorkspaceName("!!!")).toBeNull();
    expect(slugifyWorkspaceName("   ")).toBeNull();
  });

  it("truncates long slugs", () => {
    const long = "a".repeat(80);
    expect(slugifyWorkspaceName(long)?.length).toBe(48);
  });
});
