import { describe, expect, it } from "vitest";
import {
  decideDeleteWorkspaceAction,
  deleteWorkspaceBlockedMembersMessage,
  matchesWorkspaceDeleteConfirmation,
} from "../delete";

describe("decideDeleteWorkspaceAction", () => {
  it("forbids non-owners", () => {
    expect(
      decideDeleteWorkspaceAction({ isOwner: false, otherMemberCount: 0 }),
    ).toEqual({ action: "forbidden" });
  });

  it("blocks owners when other members remain", () => {
    expect(
      decideDeleteWorkspaceAction({ isOwner: true, otherMemberCount: 2 }),
    ).toEqual({ action: "blocked_members", otherMemberCount: 2 });
    expect(deleteWorkspaceBlockedMembersMessage()).toMatch(/Remove or transfer/i);
  });

  it("allows sole owners to delete", () => {
    expect(
      decideDeleteWorkspaceAction({ isOwner: true, otherMemberCount: 0 }),
    ).toEqual({ action: "delete" });
  });
});

describe("matchesWorkspaceDeleteConfirmation", () => {
  it("matches trimmed case-insensitive workspace names", () => {
    expect(matchesWorkspaceDeleteConfirmation("  Acme  ", "acme")).toBe(true);
    expect(matchesWorkspaceDeleteConfirmation("other", "acme")).toBe(false);
  });
});
