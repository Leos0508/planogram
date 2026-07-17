"use server";

import { randomBytes } from "crypto";
import {
  WorkspaceAccess,
  WorkspaceRole,
} from "@/generated/prisma/client";
import { requireSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import type { ActionResult } from "@/lib/result";
import { isInvitationActive } from "@/lib/workspaces/capabilities";
import {
  requireWorkspace,
  requireWorkspaceOwner,
} from "@/lib/workspaces/current";
import { revalidatePath } from "next/cache";

const INVITE_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

export type MemberListItem = {
  id: string;
  userId: string;
  name: string | null;
  email: string;
  role: WorkspaceRole;
  access: WorkspaceAccess;
  isSelf: boolean;
};

export type ActiveInvite = {
  id: string;
  token: string;
  expiresAt: Date;
  defaultAccess: WorkspaceAccess;
  redeemedAt: Date | null;
};

export async function listWorkspaceMembers(): Promise<
  ActionResult<MemberListItem[]>
> {
  try {
    const access = await requireWorkspace();
    if (!access.ok) return { ok: false, message: access.message };

    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId: access.workspace.id },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    return {
      ok: true,
      data: members.map((member) => ({
        id: member.id,
        userId: member.userId,
        name: member.user.name,
        email: member.user.email,
        role: member.role,
        access: member.access,
        isSelf: member.userId === access.workspace.user.id,
      })),
    };
  } catch (error) {
    console.error("[listWorkspaceMembers]", error);
    return { ok: false, message: "Failed to load members." };
  }
}

export async function getActiveInvite(): Promise<
  ActionResult<ActiveInvite | null>
> {
  try {
    const access = await requireWorkspaceOwner();
    if (!access.ok) return { ok: false, message: access.message };

    const invite = await prisma.workspaceInvitation.findFirst({
      where: {
        workspaceId: access.workspace.id,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!invite) return { ok: true, data: null };

    return {
      ok: true,
      data: {
        id: invite.id,
        token: invite.token,
        expiresAt: invite.expiresAt,
        defaultAccess: invite.defaultAccess,
        redeemedAt: invite.redeemedAt,
      },
    };
  } catch (error) {
    console.error("[getActiveInvite]", error);
    return { ok: false, message: "Failed to load invite." };
  }
}

export async function createInviteLink(): Promise<
  ActionResult<ActiveInvite>
> {
  try {
    const access = await requireWorkspaceOwner();
    if (!access.ok) return { ok: false, message: access.message };

    // Revoke prior active invites so only one link is live.
    await prisma.workspaceInvitation.updateMany({
      where: {
        workspaceId: access.workspace.id,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: { revokedAt: new Date() },
    });

    const invite = await prisma.workspaceInvitation.create({
      data: {
        token: randomBytes(24).toString("base64url"),
        workspaceId: access.workspace.id,
        createdById: access.workspace.user.id,
        expiresAt: new Date(Date.now() + INVITE_TTL_MS),
        defaultAccess: WorkspaceAccess.FULL,
      },
    });

    revalidatePath("/settings/members");
    return {
      ok: true,
      data: {
        id: invite.id,
        token: invite.token,
        expiresAt: invite.expiresAt,
        defaultAccess: invite.defaultAccess,
        redeemedAt: invite.redeemedAt,
      },
    };
  } catch (error) {
    console.error("[createInviteLink]", error);
    return { ok: false, message: "Failed to create invite link." };
  }
}

export async function revokeInviteLink(input: {
  inviteId: string;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const access = await requireWorkspaceOwner();
    if (!access.ok) return { ok: false, message: access.message };

    const invite = await prisma.workspaceInvitation.findFirst({
      where: { id: input.inviteId, workspaceId: access.workspace.id },
    });
    if (!invite) return { ok: false, message: "Invite not found." };

    await prisma.workspaceInvitation.update({
      where: { id: invite.id },
      data: { revokedAt: new Date() },
    });

    revalidatePath("/settings/members");
    return { ok: true, data: { id: invite.id } };
  } catch (error) {
    console.error("[revokeInviteLink]", error);
    return { ok: false, message: "Failed to revoke invite." };
  }
}

export async function updateMemberAccess(input: {
  memberId: string;
  access: WorkspaceAccess;
}): Promise<ActionResult<MemberListItem>> {
  if (
    input.access !== WorkspaceAccess.FULL &&
    input.access !== WorkspaceAccess.READ
  ) {
    return { ok: false, message: "Invalid access level." };
  }

  try {
    const access = await requireWorkspaceOwner();
    if (!access.ok) return { ok: false, message: access.message };

    const member = await prisma.workspaceMember.findFirst({
      where: { id: input.memberId, workspaceId: access.workspace.id },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    if (!member) return { ok: false, message: "Member not found." };
    if (member.role === WorkspaceRole.OWNER) {
      return { ok: false, message: "Cannot change access for the owner." };
    }

    const updated = await prisma.workspaceMember.update({
      where: { id: member.id },
      data: { access: input.access },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    revalidatePath("/settings/members");
    return {
      ok: true,
      data: {
        id: updated.id,
        userId: updated.userId,
        name: updated.user.name,
        email: updated.user.email,
        role: updated.role,
        access: updated.access,
        isSelf: updated.userId === access.workspace.user.id,
      },
    };
  } catch (error) {
    console.error("[updateMemberAccess]", error);
    return { ok: false, message: "Failed to update member access." };
  }
}

export async function removeMember(input: {
  memberId: string;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const access = await requireWorkspaceOwner();
    if (!access.ok) return { ok: false, message: access.message };

    const member = await prisma.workspaceMember.findFirst({
      where: { id: input.memberId, workspaceId: access.workspace.id },
    });
    if (!member) return { ok: false, message: "Member not found." };
    if (member.role === WorkspaceRole.OWNER) {
      return { ok: false, message: "Cannot remove the workspace owner." };
    }
    if (member.userId === access.workspace.user.id) {
      return { ok: false, message: "Cannot remove yourself." };
    }

    await prisma.workspaceMember.delete({ where: { id: member.id } });

    revalidatePath("/settings/members");
    return { ok: true, data: { id: member.id } };
  } catch (error) {
    console.error("[removeMember]", error);
    return { ok: false, message: "Failed to remove member." };
  }
}

/**
 * Join a workspace via invite token.
 * Does **not** change the active workspace (PLA-43) — catalogs stay on the
 * previous active until the user switches (PLA-45 / setActiveWorkspace).
 */
export async function acceptInvite(input: {
  token: string;
}): Promise<ActionResult<{ workspaceId: string; workspaceName: string }>> {
  try {
    const access = await requireWorkspace();
    if (!access.ok) return { ok: false, message: access.message };

    const invite = await prisma.workspaceInvitation.findUnique({
      where: { token: input.token },
      include: { workspace: { select: { id: true, name: true } } },
    });

    if (!invite || !isInvitationActive(invite)) {
      return { ok: false, message: "This invite link is invalid or expired." };
    }

    const existing = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId: access.workspace.user.id,
          workspaceId: invite.workspaceId,
        },
      },
    });

    if (existing) {
      return {
        ok: true,
        data: {
          workspaceId: invite.workspace.id,
          workspaceName: invite.workspace.name,
        },
      };
    }

    await prisma.$transaction(async (tx) => {
      await tx.workspaceMember.create({
        data: {
          userId: access.workspace.user.id,
          workspaceId: invite.workspaceId,
          role: WorkspaceRole.MEMBER,
          access: invite.defaultAccess,
        },
      });

      if (!invite.redeemedAt) {
        await tx.workspaceInvitation.update({
          where: { id: invite.id },
          data: { redeemedAt: new Date() },
        });
      }
    });

    revalidatePath("/settings/members");
    revalidatePath("/planograms");
    revalidatePath("/skus");

    return {
      ok: true,
      data: {
        workspaceId: invite.workspace.id,
        workspaceName: invite.workspace.name,
      },
    };
  } catch (error) {
    console.error("[acceptInvite]", error);
    return { ok: false, message: "Failed to accept invite." };
  }
}

export async function getInvitePreview(token: string): Promise<
  ActionResult<{
    workspaceName: string;
    expired: boolean;
    alreadyMember: boolean;
  }>
> {
  try {
    const session = await requireSessionUser();
    const invite = await prisma.workspaceInvitation.findUnique({
      where: { token },
      include: { workspace: { select: { id: true, name: true } } },
    });

    if (!invite) {
      return { ok: false, message: "Invite not found." };
    }

    const active = isInvitationActive(invite);
    let alreadyMember = false;

    if (session.ok) {
      const membership = await prisma.workspaceMember.findUnique({
        where: {
          userId_workspaceId: {
            userId: session.user.id,
            workspaceId: invite.workspaceId,
          },
        },
      });
      alreadyMember = !!membership;
    }

    return {
      ok: true,
      data: {
        workspaceName: invite.workspace.name,
        expired: !active,
        alreadyMember,
      },
    };
  } catch (error) {
    console.error("[getInvitePreview]", error);
    return { ok: false, message: "Failed to load invite." };
  }
}
