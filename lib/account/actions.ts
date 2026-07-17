"use server";

import { WorkspaceAccess, WorkspaceRole } from "@/generated/prisma/client";
import { signOut } from "@/auth";
import {
  blockingOwnedWorkspaces,
  matchesDeleteConfirmation,
  soleOwnedWorkspaces,
  type OwnedWorkspaceSnapshot,
} from "@/lib/account/deletion";
import { requireSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import type { ActionResult } from "@/lib/result";
import { deleteWorkspaceDeep } from "@/lib/workspaces/leave";
import { revalidatePath } from "next/cache";

export type TransferCandidate = {
  memberId: string;
  userId: string;
  name: string | null;
  email: string;
};

export type AccountDeletionStatus = {
  email: string;
  name: string | null;
  blockers: OwnedWorkspaceSnapshot[];
  soleOwned: OwnedWorkspaceSnapshot[];
  /** Members eligible for OWNER transfer in the current workspace (if blocked). */
  transferCandidates: TransferCandidate[];
  currentWorkspaceId: string | null;
};

async function loadOwnedSnapshots(
  userId: string,
): Promise<OwnedWorkspaceSnapshot[]> {
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId, role: WorkspaceRole.OWNER },
    include: {
      workspace: {
        select: {
          id: true,
          name: true,
          _count: { select: { members: true } },
        },
      },
    },
  });

  return memberships.map((membership) => ({
    workspaceId: membership.workspace.id,
    workspaceName: membership.workspace.name,
    role: membership.role,
    otherMemberCount: Math.max(0, membership.workspace._count.members - 1),
  }));
}

export async function getAccountDeletionStatus(): Promise<
  ActionResult<AccountDeletionStatus>
> {
  try {
    const session = await requireSessionUser();
    if (!session.ok) return { ok: false, message: session.message };

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, email: true, name: true },
    });
    if (!user) return { ok: false, message: "Account not found." };

    const owned = await loadOwnedSnapshots(user.id);
    const blockers = blockingOwnedWorkspaces(owned);
    const soleOwned = soleOwnedWorkspaces(owned);

    let transferCandidates: TransferCandidate[] = [];
    let currentWorkspaceId: string | null = null;

    if (blockers.length > 0) {
      // Prefer transferring the current (newest) membership workspace when blocked.
      const currentMembership = await prisma.workspaceMember.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        select: { workspaceId: true, role: true },
      });
      currentWorkspaceId = currentMembership?.workspaceId ?? blockers[0].workspaceId;

      const blockerIds = new Set(blockers.map((item) => item.workspaceId));
      const transferWorkspaceId = blockerIds.has(currentWorkspaceId)
        ? currentWorkspaceId
        : blockers[0].workspaceId;
      currentWorkspaceId = transferWorkspaceId;

      const members = await prisma.workspaceMember.findMany({
        where: {
          workspaceId: transferWorkspaceId,
          role: WorkspaceRole.MEMBER,
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "asc" },
      });

      transferCandidates = members.map((member) => ({
        memberId: member.id,
        userId: member.userId,
        name: member.user.name,
        email: member.user.email,
      }));
    }

    return {
      ok: true,
      data: {
        email: user.email,
        name: user.name,
        blockers,
        soleOwned,
        transferCandidates,
        currentWorkspaceId,
      },
    };
  } catch (error) {
    console.error("[getAccountDeletionStatus]", error);
    return { ok: false, message: "Failed to load account deletion status." };
  }
}

export async function transferWorkspaceOwnership(input: {
  workspaceId: string;
  memberId: string;
}): Promise<ActionResult<{ workspaceId: string }>> {
  try {
    const session = await requireSessionUser();
    if (!session.ok) return { ok: false, message: session.message };

    const myMembership = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId: session.user.id,
          workspaceId: input.workspaceId,
        },
      },
    });

    if (!myMembership || myMembership.role !== WorkspaceRole.OWNER) {
      return {
        ok: false,
        message: "Only the workspace owner can transfer ownership.",
      };
    }

    const target = await prisma.workspaceMember.findFirst({
      where: {
        id: input.memberId,
        workspaceId: input.workspaceId,
        role: WorkspaceRole.MEMBER,
      },
    });

    if (!target) {
      return { ok: false, message: "Select a member to transfer ownership to." };
    }

    await prisma.$transaction([
      prisma.workspaceMember.update({
        where: { id: target.id },
        data: { role: WorkspaceRole.OWNER, access: WorkspaceAccess.FULL },
      }),
      prisma.workspaceMember.update({
        where: { id: myMembership.id },
        data: { role: WorkspaceRole.MEMBER },
      }),
    ]);

    revalidatePath("/settings/account");
    revalidatePath("/settings/members");
    revalidatePath("/settings");
    return { ok: true, data: { workspaceId: input.workspaceId } };
  } catch (error) {
    console.error("[transferWorkspaceOwnership]", error);
    return { ok: false, message: "Failed to transfer ownership." };
  }
}

export async function deleteAccount(input: {
  confirmation: string;
}): Promise<ActionResult<{ id: string }>> {
  const session = await requireSessionUser();
  if (!session.ok) return { ok: false, message: session.message };

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true },
  });
  if (!user) return { ok: false, message: "Account not found." };

  if (!matchesDeleteConfirmation(input.confirmation, user.email)) {
    return {
      ok: false,
      message: "Type your email exactly to confirm account deletion.",
    };
  }

  const owned = await loadOwnedSnapshots(user.id);
  const blockers = blockingOwnedWorkspaces(owned);
  if (blockers.length > 0) {
    const names = blockers.map((item) => item.workspaceName).join(", ");
    return {
      ok: false,
      message: `Transfer ownership of ${names} before deleting your account.`,
    };
  }

  const soleOwned = soleOwnedWorkspaces(owned);

  try {
    await prisma.$transaction(async (tx) => {
      for (const workspace of soleOwned) {
        await deleteWorkspaceDeep(tx, workspace.workspaceId);
      }
      await tx.user.delete({ where: { id: user.id } });
    });
  } catch (error) {
    console.error("[deleteAccount]", error);
    return { ok: false, message: "Failed to delete account." };
  }

  revalidatePath("/");
  await signOut({ redirectTo: "/" });
  return { ok: true, data: { id: user.id } };
}
