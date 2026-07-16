import { WorkspaceRole, type WorkspaceTier } from "@/generated/prisma/client";
import { requireSessionUser, type SessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { createWorkspaceForUser } from "@/lib/workspaces/bootstrap";
import { isCrossWorkspaceMiss } from "@/lib/workspaces/access";

export { isCrossWorkspaceMiss };

/**
 * Current workspace for the signed-in user.
 * v1: oldest membership (single workspace). Structured for a future switcher.
 */
export type CurrentWorkspace = {
  id: string;
  name: string;
  slug: string | null;
  tier: WorkspaceTier;
  role: WorkspaceRole;
  user: SessionUser;
};

export async function getCurrentWorkspace(): Promise<CurrentWorkspace | null> {
  const session = await requireSessionUser();
  if (!session.ok) {
    return null;
  }

  const membership = await prisma.workspaceMember.findFirst({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
    include: { workspace: true },
  });

  if (membership) {
    return {
      id: membership.workspace.id,
      name: membership.workspace.name,
      slug: membership.workspace.slug,
      tier: membership.workspace.tier,
      role: membership.role,
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
