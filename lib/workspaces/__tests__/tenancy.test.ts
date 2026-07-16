import { describe, expect, it } from "vitest";
import { isCrossWorkspaceMiss } from "../access";

describe("isCrossWorkspaceMiss", () => {
  it("treats missing or foreign workspaceId as a miss", () => {
    expect(isCrossWorkspaceMiss(undefined, "ws-a")).toBe(true);
    expect(isCrossWorkspaceMiss(null, "ws-a")).toBe(true);
    expect(isCrossWorkspaceMiss("ws-b", "ws-a")).toBe(true);
  });

  it("allows matching workspaceId", () => {
    expect(isCrossWorkspaceMiss("ws-a", "ws-a")).toBe(false);
  });
});
