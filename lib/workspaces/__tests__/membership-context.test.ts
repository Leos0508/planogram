import { describe, expect, it } from "vitest";
import { resolveActiveWorkspaceId } from "@/lib/workspaces/active";
import { mapMembershipsToListItems } from "@/lib/workspaces/list";
import {
  WorkspaceAccess,
  WorkspaceRole,
  WorkspaceTier,
} from "@/generated/prisma/client";

/**
 * Documents the PLA-98 request path: one membership snapshot feeds both the
 * switcher list and the active CurrentWorkspace resolve.
 */
describe("membership context → list + active (PLA-98)", () => {
  const memberships = [
    {
      workspaceId: "ws-a",
      role: WorkspaceRole.OWNER,
      access: WorkspaceAccess.FULL,
      workspace: {
        id: "ws-a",
        name: "Alpha",
        slug: null,
        tier: WorkspaceTier.FREE,
      },
    },
    {
      workspaceId: "ws-b",
      role: WorkspaceRole.MEMBER,
      access: WorkspaceAccess.READ,
      workspace: {
        id: "ws-b",
        name: "Beta",
        slug: null,
        tier: WorkspaceTier.FREE,
      },
    },
  ];

  it("derives the same active id for list marking and current workspace", () => {
    const activeId = resolveActiveWorkspaceId({
      cookieWorkspaceId: "ws-b",
      dbWorkspaceId: "ws-a",
      membershipWorkspaceIds: memberships.map((m) => m.workspaceId),
    });

    expect(activeId).toBe("ws-b");

    const list = mapMembershipsToListItems(memberships, activeId);
    expect(list.find((item) => item.isActive)?.id).toBe("ws-b");

    const current =
      memberships.find((m) => m.workspaceId === activeId) ?? memberships[0];
    expect(current.workspace.id).toBe("ws-b");
    expect(current.access).toBe(WorkspaceAccess.READ);
  });
});
