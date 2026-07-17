import { describe, expect, it } from "vitest";
import { WorkspaceRole } from "@/generated/prisma/client";
import {
  decideLeaveAction,
  leaveBlockedTransferMessage,
} from "../leave";

describe("decideLeaveAction", () => {
  it("lets members leave by removing membership", () => {
    expect(
      decideLeaveAction({
        role: WorkspaceRole.MEMBER,
        otherMemberCount: 5,
      }),
    ).toEqual({ action: "remove_membership" });
  });

  it("deletes the workspace when the sole owner leaves", () => {
    expect(
      decideLeaveAction({
        role: WorkspaceRole.OWNER,
        otherMemberCount: 0,
      }),
    ).toEqual({ action: "delete_workspace" });
  });

  it("blocks owners when other members remain", () => {
    expect(
      decideLeaveAction({
        role: WorkspaceRole.OWNER,
        otherMemberCount: 2,
      }),
    ).toEqual({ action: "blocked_transfer", otherMemberCount: 2 });
    expect(leaveBlockedTransferMessage()).toMatch(/Transfer ownership/i);
  });
});
