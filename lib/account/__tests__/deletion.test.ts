import { describe, expect, it } from "vitest";
import { WorkspaceRole } from "@/generated/prisma/enums";
import {
  blockingOwnedWorkspaces,
  matchesDeleteConfirmation,
  soleOwnedWorkspaces,
} from "../deletion";

describe("blockingOwnedWorkspaces", () => {
  it("returns OWNER workspaces with other members", () => {
    const blockers = blockingOwnedWorkspaces([
      {
        workspaceId: "a",
        workspaceName: "A",
        role: WorkspaceRole.OWNER,
        otherMemberCount: 2,
      },
      {
        workspaceId: "b",
        workspaceName: "B",
        role: WorkspaceRole.OWNER,
        otherMemberCount: 0,
      },
    ]);
    expect(blockers).toHaveLength(1);
    expect(blockers[0].workspaceId).toBe("a");
  });
});

describe("soleOwnedWorkspaces", () => {
  it("returns OWNER workspaces with no other members", () => {
    const sole = soleOwnedWorkspaces([
      {
        workspaceId: "a",
        workspaceName: "A",
        role: WorkspaceRole.OWNER,
        otherMemberCount: 0,
      },
      {
        workspaceId: "b",
        workspaceName: "B",
        role: WorkspaceRole.OWNER,
        otherMemberCount: 1,
      },
    ]);
    expect(sole).toHaveLength(1);
    expect(sole[0].workspaceId).toBe("a");
  });
});

describe("matchesDeleteConfirmation", () => {
  it("matches email case-insensitively with trim", () => {
    expect(matchesDeleteConfirmation("  Me@Test.COM ", "me@test.com")).toBe(
      true,
    );
    expect(matchesDeleteConfirmation("other@test.com", "me@test.com")).toBe(
      false,
    );
  });
});
