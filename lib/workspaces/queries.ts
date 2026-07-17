import type { QueryResult } from "@/lib/result";
import { requireSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { resolveActiveWorkspaceId } from "@/lib/workspaces/active";
import { readActiveWorkspaceCookie } from "@/lib/workspaces/cookie";
import {
  mapMembershipsToListItems,
  type WorkspaceMembershipListItem,
} from "@/lib/workspaces/list";

export type { WorkspaceMembershipListItem };

/**
 * Memberships for the signed-in user (switcher). Ordered by workspace name.
 */
export async function listMyWorkspaces(): Promise<
  QueryResult<WorkspaceMembershipListItem[]>
> {
  try {
    const session = await requireSessionUser();
    if (!session.ok) {
      return { ok: false, code: "NOT_FOUND", message: "You must be signed in." };
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
        select: {
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

    const activeWorkspaceId = resolveActiveWorkspaceId({
      cookieWorkspaceId,
      dbWorkspaceId: userRow?.activeWorkspaceId,
      membershipWorkspaceIds: memberships.map((m) => m.workspace.id),
    });

    return {
      ok: true,
      data: mapMembershipsToListItems(memberships, activeWorkspaceId),
    };
  } catch (error) {
    console.error("[listMyWorkspaces]", error);
    return {
      ok: false,
      code: "DB_ERROR",
      message: "Failed to load workspaces.",
    };
  }
}
