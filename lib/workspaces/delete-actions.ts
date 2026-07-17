"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/result";
import { prisma } from "@/lib/prisma";
import { createWorkspaceForUser } from "@/lib/workspaces/bootstrap";
import { writeActiveWorkspaceCookie } from "@/lib/workspaces/cookie";
import { requireWorkspaceOwner } from "@/lib/workspaces/current";
import {
  decideDeleteWorkspaceAction,
  deleteWorkspaceBlockedMembersMessage,
  deleteWorkspaceConfirmationMismatchMessage,
  deleteWorkspaceForbiddenMessage,
  matchesWorkspaceDeleteConfirmation,
} from "@/lib/workspaces/delete";
import { deleteWorkspaceDeep } from "@/lib/workspaces/leave";

/**
 * Hard-delete the active workspace (OWNER, sole member).
 * Confirm by typing the workspace name. Last membership → bootstrap personal.
 */
export async function deleteWorkspace(input: {
  confirmation: string;
}): Promise<
  ActionResult<{
    deletedWorkspaceId: string;
    deletedWorkspaceName: string;
    nextWorkspaceId: string;
  }>
> {
  try {
    const access = await requireWorkspaceOwner();
    if (!access.ok) {
      return {
        ok: false,
        message:
          access.message === "You must be signed in."
            ? access.message
            : deleteWorkspaceForbiddenMessage(),
      };
    }

    const { workspace } = access;
    const userId = workspace.user.id;
    const workspaceId = workspace.id;

    const memberCount = await prisma.workspaceMember.count({
      where: { workspaceId },
    });
    const otherMemberCount = Math.max(0, memberCount - 1);
    const decision = decideDeleteWorkspaceAction({
      isOwner: true,
      otherMemberCount,
    });

    if (decision.action === "forbidden") {
      return { ok: false, message: deleteWorkspaceForbiddenMessage() };
    }
    if (decision.action === "blocked_members") {
      return { ok: false, message: deleteWorkspaceBlockedMembersMessage() };
    }

    if (
      !matchesWorkspaceDeleteConfirmation(input.confirmation, workspace.name)
    ) {
      return {
        ok: false,
        message: deleteWorkspaceConfirmationMismatchMessage(),
      };
    }

    const deletedWorkspaceName = workspace.name;

    const billing = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { stripeSubscriptionId: true },
    });
    const { cancelStripeSubscriptionIfPresent } = await import(
      "@/lib/billing/sync"
    );
    await cancelStripeSubscriptionIfPresent({
      stripeSubscriptionId: billing?.stripeSubscriptionId ?? null,
    });

    await prisma.$transaction(async (tx) => {
      await deleteWorkspaceDeep(tx, workspaceId);
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
        deletedWorkspaceId: workspaceId,
        deletedWorkspaceName,
        nextWorkspaceId,
      },
    };
  } catch (error) {
    console.error("[deleteWorkspace]", error);
    return { ok: false, message: "Failed to delete workspace." };
  }
}
