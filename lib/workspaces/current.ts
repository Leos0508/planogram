import {
  WorkspaceAccess,
  WorkspaceRole,
  type WorkspaceTier,
} from "@/generated/prisma/client";
import { requireSessionUser, type SessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { resolveActiveWorkspaceId } from "@/lib/workspaces/active";
import { createWorkspaceForUser } from "@/lib/workspaces/bootstrap";
import {
  canManageMembers,
  canWriteWorkspace,
  WORKSPACE_READ_ONLY_HINT,
} from "@/lib/workspaces/capabilities";
import { isCrossWorkspaceMiss } from "@/lib/workspaces/access";
import { readActiveWorkspaceCookie } from "@/lib/workspaces/cookie";

export { isCrossWorkspaceMiss };

/**
 * Current workspace for the signed-in user.
 * Resolved from cookie → User.activeWorkspaceId → oldest membership.
 *
 * Invite accept does **not** change the active workspace (PLA-43); the user
 * stays on their previous active until they switch (PLA-45) or create/set
 * active explicitly.
 */
export type CurrentWorkspace = {
  id: string;
  name: string;
  slug: string | null;
  tier: WorkspaceTier;
  role: WorkspaceRole;
  access: WorkspaceAccess;
  user: SessionUser;
};

function toCurrentWorkspace(
  membership: {
    role: WorkspaceRole;
    access: WorkspaceAccess;
    workspace: {
      id: string;
      name: string;
      slug: string | null;
      tier: WorkspaceTier;
    };
  },
  user: SessionUser,
): CurrentWorkspace {
  return {
    id: membership.workspace.id,
    name: membership.workspace.name,
    slug: membership.workspace.slug,
    tier: membership.workspace.tier,
    role: membership.role,
    access: membership.access,
    user,
  };
}

export async function getCurrentWorkspace(): Promise<CurrentWorkspace | null> {
  const session = await requireSessionUser();
  if (!session.ok) {
    return null;
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
      include: { workspace: true },
    }),
  ]);

  if (memberships.length > 0) {
    const activeId = resolveActiveWorkspaceId({
      cookieWorkspaceId,
      dbWorkspaceId: userRow?.activeWorkspaceId,
      membershipWorkspaceIds: memberships.map((m) => m.workspaceId),
    });

    const membership =
      memberships.find((m) => m.workspaceId === activeId) ?? memberships[0];

    return toCurrentWorkspace(membership, session.user);
  }

  const workspace = await createWorkspaceForUser(prisma, {
    userId,
    name: session.user.name,
    email: session.user.email,
  });

  return {
    id: workspace.id,
    name: workspace.name,
    slug: workspace.slug,
    tier: workspace.tier,
    role: WorkspaceRole.OWNER,
    access: WorkspaceAccess.FULL,
    user: session.user,
  };
}

export async function requireWorkspace(): Promise<
  { ok: true; workspace: CurrentWorkspace } | { ok: false; message: string }
> {
  const workspace = await getCurrentWorkspace();
  if (!workspace) {
    return { ok: false, message: "You must be signed in." };
  }
  return { ok: true, workspace };
}

export async function requireWorkspaceWrite(): Promise<
  { ok: true; workspace: CurrentWorkspace } | { ok: false; message: string }
> {
  const access = await requireWorkspace();
  if (!access.ok) return access;
  if (!canWriteWorkspace(access.workspace)) {
    return {
      ok: false,
      message: WORKSPACE_READ_ONLY_HINT,
    };
  }
  return access;
}

export async function requireWorkspaceOwner(): Promise<
  { ok: true; workspace: CurrentWorkspace } | { ok: false; message: string }
> {
  const access = await requireWorkspace();
  if (!access.ok) return access;
  if (!canManageMembers(access.workspace)) {
    return {
      ok: false,
      message: "Only the workspace owner can manage members.",
    };
  }
  return access;
}

/** Planogram lookup scoped to workspace — cross-workspace → null (treat as NOT_FOUND). */
export async function findPlanogramInWorkspace(
  planogramId: string,
  workspaceId: string,
) {
  return prisma.planogram.findFirst({
    where: { id: planogramId, workspaceId },
  });
}

/** SKU lookup scoped to workspace — cross-workspace → null (treat as NOT_FOUND). */
export async function findSkuInWorkspace(skuId: string, workspaceId: string) {
  return prisma.sKU.findFirst({
    where: { id: skuId, workspaceId },
  });
}
