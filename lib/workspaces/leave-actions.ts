"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/result";
import { prisma } from "@/lib/prisma";
import { createWorkspaceForUser } from "@/lib/workspaces/bootstrap";
import { writeActiveWorkspaceCookie } from "@/lib/workspaces/cookie";
import { requireWorkspace } from "@/lib/workspaces/current";
import {
  decideLeaveAction,
  deleteWorkspaceDeep,
  leaveBlockedTransferMessage,
} from "@/lib/workspaces/leave";

/**
 * Leave the active workspace.
 * MEMBER: remove membership. Sole OWNER: delete workspace. OWNER with others: blocked.
 */
export async function leaveWorkspace(): Promise<
  ActionResult<{
    leftWorkspaceId: string;
    leftWorkspaceName: string;
    deletedWorkspace: boolean;
    nextWorkspaceId: string;
  }>
> {
  try {
    const access = await requireWorkspace();
    if (!access.ok) {
      return { ok: false, message: access.message };
    }

    const { workspace } = access;
    const userId = workspace.user.id;
    const workspaceId = workspace.id;

    const memberCount = await prisma.workspaceMember.count({
      where: { workspaceId },
    });
    const otherMemberCount = Math.max(0, memberCount - 1);
    const decision = decideLeaveAction({
      role: workspace.role,
      otherMemberCount,
    });

    if (decision.action === "blocked_transfer") {
      return { ok: false, message: leaveBlockedTransferMessage() };
    }

    const leftWorkspaceName = workspace.name;

    await prisma.$transaction(async (tx) => {
      if (decision.action === "delete_workspace") {
        await deleteWorkspaceDeep(tx, workspaceId);
      } else {
        await tx.workspaceMember.delete({
          where: {
            userId_workspaceId: { userId, workspaceId },
          },
        });
      }
    });

    const remaining = await prisma.workspaceMember.findFirst({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: { workspaceId: true },
    });

    let nextWorkspaceId = remaining?.workspaceId;
    if (!nextWorkspaceId) {
      const personal = await createWorkspaceForUser(prisma, {
        userId,
        name: workspace.user.name,
        email: workspace.user.email,
      });
      nextWorkspaceId = personal.id;
    }

    await prisma.user.update({
      where: { id: userId },
      data: { activeWorkspaceId: nextWorkspaceId },
    });
    await writeActiveWorkspaceCookie(nextWorkspaceId);
    revalidatePath("/", "layout");
    revalidatePath("/planograms");
    revalidatePath("/skus");
    revalidatePath("/settings");
    revalidatePath("/settings/members");
    revalidatePath("/settings/account");

    return {
      ok: true,
      data: {
        leftWorkspaceId: workspaceId,
        leftWorkspaceName,
        deletedWorkspace: decision.action === "delete_workspace",
        nextWorkspaceId,
      },
    };
  } catch (error) {
    console.error("[leaveWorkspace]", error);
    return { ok: false, message: "Failed to leave workspace." };
  }
}
