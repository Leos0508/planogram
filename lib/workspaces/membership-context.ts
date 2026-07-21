import { cache } from "react";
import type {
  WorkspaceAccess,
  WorkspaceRole,
  WorkspaceTier,
} from "@/generated/prisma/client";
import { requireSessionUser, type SessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { readActiveWorkspaceCookie } from "@/lib/workspaces/cookie";
import type { WorkspaceMembershipRow } from "@/lib/workspaces/list";

export type MembershipContext = {
  user: SessionUser;
  cookieWorkspaceId: string | null;
  dbWorkspaceId: string | null;
  memberships: Array<
    WorkspaceMembershipRow & {
      workspaceId: string;
    }
  >;
};

/**
 * One membership + active-workspace cookie/DB snapshot per request.
 * Shared by `getCurrentWorkspace` and `listMyWorkspaces` via React.cache.
 */
export const getMembershipContext = cache(
  async (): Promise<
    { ok: true; data: MembershipContext } | { ok: false; message: string }
  > => {
    const session = await requireSessionUser();
    if (!session.ok) {
      return { ok: false, message: session.message };
    }

    const userId = session.user.id;

    const [cookieWorkspaceId, userRow, memberships] = await Promise.all([
      readActiveWorkspaceCookie(),
      prisma.user.findUnique({
        where: { id: userId },
        select: { activeWorkspaceId: true },
      }),
      prisma.workspaceMember.findMany({
        where: { userId },
        orderBy: { createdAt: "asc" },
        select: {
          workspaceId: true,
          role: true,
          access: true,
          workspace: {
            select: {
              id: true,
              name: true,
              slug: true,
              tier: true,
            },
          },
        },
      }),
    ]);

    return {
      ok: true,
      data: {
        user: session.user,
        cookieWorkspaceId,
        dbWorkspaceId: userRow?.activeWorkspaceId ?? null,
        memberships: memberships.map((row) => ({
          workspaceId: row.workspaceId,
          role: row.role as WorkspaceRole,
          access: row.access as WorkspaceAccess,
          workspace: {
            id: row.workspace.id,
            name: row.workspace.name,
            slug: row.workspace.slug,
            tier: row.workspace.tier as WorkspaceTier,
          },
        })),
      },
    };
  },
);
