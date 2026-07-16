import {
  WorkspaceAccess,
  WorkspaceRole,
  type WorkspaceTier,
} from "@/generated/prisma/client";
import { requireSessionUser, type SessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { createWorkspaceForUser } from "@/lib/workspaces/bootstrap";
import {
  canManageMembers,
  canWriteWorkspace,
} from "@/lib/workspaces/capabilities";
import { isCrossWorkspaceMiss } from "@/lib/workspaces/access";

export { isCrossWorkspaceMiss };

/**
 * Current workspace for the signed-in user.
 * v1: newest membership so accepting an invite surfaces the shared workspace.
 * Plan 02 replaces this with an explicit active-workspace preference.
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

export async function getCurrentWorkspace(): Promise<CurrentWorkspace | null> {
  const session = await requireSessionUser();
  if (!session.ok) {
    return null;
  }

  const membership = await prisma.workspaceMember.findFirst({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: { workspace: true },
  });

  if (membership) {
    return {
      id: membership.workspace.id,
      name: membership.workspace.name,
      slug: membership.workspace.slug,
      tier: membership.workspace.tier,
      role: membership.role,
      access: membership.access,
      user: session.user,
    };
  }

  const workspace = await createWorkspaceForUser(prisma, {
    userId: session.user.id,
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
      message: "You have read-only access to this workspace.",
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
