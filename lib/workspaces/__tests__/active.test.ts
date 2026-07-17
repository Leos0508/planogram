import { describe, expect, it } from "vitest";
import { resolveActiveWorkspaceId } from "../active";

describe("resolveActiveWorkspaceId", () => {
  const memberships = ["ws-oldest", "ws-mid", "ws-newest"];

  it("prefers a valid cookie over DB and membership order", () => {
    expect(
      resolveActiveWorkspaceId({
        cookieWorkspaceId: "ws-newest",
        dbWorkspaceId: "ws-mid",
        membershipWorkspaceIds: memberships,
      }),
    ).toBe("ws-newest");
  });

  it("uses DB preference when cookie is missing or invalid", () => {
    expect(
      resolveActiveWorkspaceId({
        cookieWorkspaceId: null,
        dbWorkspaceId: "ws-mid",
        membershipWorkspaceIds: memberships,
      }),
    ).toBe("ws-mid");

    expect(
      resolveActiveWorkspaceId({
        cookieWorkspaceId: "ws-gone",
        dbWorkspaceId: "ws-mid",
        membershipWorkspaceIds: memberships,
      }),
    ).toBe("ws-mid");
  });

  it("falls back to oldest membership when preferences are invalid", () => {
    expect(
      resolveActiveWorkspaceId({
        cookieWorkspaceId: "ws-gone",
        dbWorkspaceId: "ws-also-gone",
        membershipWorkspaceIds: memberships,
      }),
    ).toBe("ws-oldest");
  });

  it("returns null when the user has no memberships", () => {
    expect(
      resolveActiveWorkspaceId({
        cookieWorkspaceId: "ws-a",
        dbWorkspaceId: "ws-a",
        membershipWorkspaceIds: [],
      }),
    ).toBeNull();
  });
});
