"use server";

import { revalidatePath } from "next/cache";
import { WorkspaceRole, WorkspaceTier } from "@/generated/prisma/client";
import type { ActionResult } from "@/lib/result";
import { requireSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { slugifyWorkspaceName } from "@/lib/workspaces/bootstrap";
import { writeActiveWorkspaceCookie } from "@/lib/workspaces/cookie";
import {
  canOwnAnotherWorkspace,
  ownedWorkspaceLimitMessage,
} from "@/lib/workspaces/limits";
import { validateWorkspaceName } from "@/lib/settings/validation";

async function persistActiveWorkspace(
  userId: string,
  workspaceId: string,
): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { activeWorkspaceId: workspaceId },
  });
  await writeActiveWorkspaceCookie(workspaceId);
  revalidatePath("/", "layout");
  revalidatePath("/planograms");
  revalidatePath("/skus");
  revalidatePath("/settings");
}

/**
 * Persist the active workspace (cookie + User.activeWorkspaceId).
 * Caller must be a member of the target workspace.
 */
export async function setActiveWorkspace(input: {
  workspaceId: string;
}): Promise<ActionResult<{ workspaceId: string }>> {
  try {
    const session = await requireSessionUser();
    if (!session.ok) {
      return { ok: false, message: "You must be signed in." };
    }

    const workspaceId = input.workspaceId.trim();
    if (!workspaceId) {
      return { ok: false, message: "Workspace is required." };
    }

    const membership = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId: session.user.id,
          workspaceId,
        },
      },
      select: { id: true },
    });

    if (!membership) {
      return { ok: false, message: "Workspace not found." };
    }

    await persistActiveWorkspace(session.user.id, workspaceId);

    return { ok: true, data: { workspaceId } };
  } catch (error) {
    console.error("[setActiveWorkspace]", error);
    return { ok: false, message: "Failed to switch workspace." };
  }
}

/**
 * Create an empty FREE workspace; caller becomes OWNER and it becomes active.
 */
export async function createWorkspace(input: {
  name: string;
}): Promise<ActionResult<{ workspaceId: string; name: string }>> {
  try {
    const session = await requireSessionUser();
    if (!session.ok) {
      return { ok: false, message: "You must be signed in." };
    }

    const nameError = validateWorkspaceName(input.name);
    if (nameError) {
      return { ok: false, message: nameError };
    }

    const name = input.name.trim();
    const userId = session.user.id;

    const ownedCount = await prisma.workspaceMember.count({
      where: { userId, role: WorkspaceRole.OWNER },
    });

    if (!canOwnAnotherWorkspace(ownedCount)) {
      return { ok: false, message: ownedWorkspaceLimitMessage() };
    }

    const baseSlug =
      slugifyWorkspaceName(name) ?? `ws-${userId.slice(0, 8)}`;
    const slug = `${baseSlug}-${crypto.randomUUID().slice(0, 8)}`;

    const workspace = await prisma.workspace.create({
      data: {
        name,
        slug,
        tier: WorkspaceTier.FREE,
        members: {
          create: {
            userId,
            role: WorkspaceRole.OWNER,
          },
        },
      },
      select: { id: true, name: true },
    });

    await persistActiveWorkspace(userId, workspace.id);

    return {
      ok: true,
      data: { workspaceId: workspace.id, name: workspace.name },
    };
  } catch (error) {
    console.error("[createWorkspace]", error);
    return { ok: false, message: "Failed to create workspace." };
  }
}
