import { describe, expect, it } from "vitest";
import {
  inviteAlreadyMemberMessage,
  inviteJoinedStayMessage,
  shouldOfferSwitchToJoined,
} from "../invite";

describe("shouldOfferSwitchToJoined", () => {
  it("offers switch when joined workspace is not active", () => {
    expect(
      shouldOfferSwitchToJoined({
        joinedWorkspaceId: "b",
        activeWorkspaceId: "a",
      }),
    ).toBe(true);
  });

  it("hides switch when already active in the joined workspace", () => {
    expect(
      shouldOfferSwitchToJoined({
        joinedWorkspaceId: "a",
        activeWorkspaceId: "a",
      }),
    ).toBe(false);
  });
});

describe("invite messages", () => {
  it("documents stay-on-active after join", () => {
    expect(inviteJoinedStayMessage("Acme")).toMatch(/active workspace is unchanged/i);
    expect(inviteAlreadyMemberMessage("Acme")).toMatch(/already a member/i);
  });
});
