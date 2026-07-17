"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/result";
import { requireSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { writeActiveWorkspaceCookie } from "@/lib/workspaces/cookie";

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

    await prisma.user.update({
      where: { id: session.user.id },
      data: { activeWorkspaceId: workspaceId },
    });

    await writeActiveWorkspaceCookie(workspaceId);

    revalidatePath("/", "layout");
    revalidatePath("/planograms");
    revalidatePath("/skus");
    revalidatePath("/settings");

    return { ok: true, data: { workspaceId } };
  } catch (error) {
    console.error("[setActiveWorkspace]", error);
    return { ok: false, message: "Failed to switch workspace." };
  }
}
