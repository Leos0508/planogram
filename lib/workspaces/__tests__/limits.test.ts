import { describe, expect, it } from "vitest";
import {
  MAX_OWNED_WORKSPACES_SOFT,
  canOwnAnotherWorkspace,
  ownedWorkspaceLimitMessage,
} from "../limits";

describe("canOwnAnotherWorkspace", () => {
  it("allows create under the soft cap", () => {
    expect(canOwnAnotherWorkspace(0)).toBe(true);
    expect(canOwnAnotherWorkspace(MAX_OWNED_WORKSPACES_SOFT - 1)).toBe(true);
  });

  it("blocks create at or above the soft cap", () => {
    expect(canOwnAnotherWorkspace(MAX_OWNED_WORKSPACES_SOFT)).toBe(false);
    expect(canOwnAnotherWorkspace(MAX_OWNED_WORKSPACES_SOFT + 1)).toBe(false);
  });
});

describe("ownedWorkspaceLimitMessage", () => {
  it("mentions the limit", () => {
    expect(ownedWorkspaceLimitMessage(3)).toContain("3");
  });
});
