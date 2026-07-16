"use server";

import { WorkspaceRole } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { ActionResult } from "@/lib/result";
import {
  normalizeDisplayName,
  validateDisplayName,
  validateWorkspaceName,
} from "@/lib/settings/validation";
import { requireWorkspace } from "@/lib/workspaces/current";
import { revalidatePath } from "next/cache";

export type WorkspaceSettings = {
  id: string;
  name: string;
  role: WorkspaceRole;
};

export type AccountSettings = {
  id: string;
  name: string | null;
  email: string;
};

export async function updateWorkspaceName(input: {
  name: string;
}): Promise<ActionResult<WorkspaceSettings>> {
  const error = validateWorkspaceName(input.name);
  if (error) return { ok: false, message: error };

  try {
    const access = await requireWorkspace();
    if (!access.ok) return { ok: false, message: access.message };

    if (access.workspace.role !== WorkspaceRole.OWNER) {
      return {
        ok: false,
        message: "Only the workspace owner can rename the workspace.",
      };
    }

    const name = input.name.trim();
    const updated = await prisma.workspace.update({
      where: { id: access.workspace.id },
      data: { name },
    });

    revalidatePath("/settings");
    return {
      ok: true,
      data: {
        id: updated.id,
        name: updated.name,
        role: access.workspace.role,
      },
    };
  } catch (error) {
    console.error("[updateWorkspaceName]", error);
    return { ok: false, message: "Failed to update workspace name." };
  }
}

export async function updateDisplayName(input: {
  name: string;
}): Promise<ActionResult<AccountSettings>> {
  const error = validateDisplayName(input.name);
  if (error) return { ok: false, message: error };

  try {
    const access = await requireWorkspace();
    if (!access.ok) return { ok: false, message: access.message };

    const name = normalizeDisplayName(input.name);
    const updated = await prisma.user.update({
      where: { id: access.workspace.user.id },
      data: { name },
      select: { id: true, name: true, email: true },
    });

    revalidatePath("/settings");
    revalidatePath("/settings/account");
    return { ok: true, data: updated };
  } catch (error) {
    console.error("[updateDisplayName]", error);
    return { ok: false, message: "Failed to update display name." };
  }
}
