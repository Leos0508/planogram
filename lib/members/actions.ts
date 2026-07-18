"use server";

import { randomBytes } from "crypto";
import {
  WorkspaceAccess,
  WorkspaceRole,
} from "@/generated/prisma/client";
import { requireSessionUser } from "@/lib/auth/session";
import { getAppBaseUrl } from "@/lib/billing/stripe";
import { sendEmail } from "@/lib/email/send";
import { prisma } from "@/lib/prisma";
import type { ActionResult } from "@/lib/result";
import { isInvitationActive } from "@/lib/workspaces/capabilities";
import {
  getCurrentWorkspace,
  requireWorkspace,
  requireWorkspaceOwner,
} from "@/lib/workspaces/current";
import { shouldOfferSwitchToJoined } from "@/lib/members/invite";
import { revalidatePath } from "next/cache";

const INVITE_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

function normalizeInviteEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isValidInviteEmail(email: string): boolean {
  // Practical check — not full RFC.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function toActiveInvite(invite: {
  id: string;
  token: string;
  expiresAt: Date;
  defaultAccess: WorkspaceAccess;
  redeemedAt: Date | null;
}): ActiveInvite {
  return {
    id: invite.id,
    token: invite.token,
    expiresAt: invite.expiresAt,
    defaultAccess: invite.defaultAccess,
    redeemedAt: invite.redeemedAt,
  };
}

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

/**
 * Ensure an active invite exists (reuse or create), then email the accept link.
 * Copy-link flow is unchanged.
 */
export async function sendInviteEmail(input: {
  email: string;
}): Promise<ActionResult<{ invite: ActiveInvite; emailedTo: string }>> {
  const email = normalizeInviteEmail(input.email);
  if (!email || !isValidInviteEmail(email)) {
    return { ok: false, message: "Enter a valid email address." };
  }

  try {
    const access = await requireWorkspaceOwner();
    if (!access.ok) return { ok: false, message: access.message };

    let invite = await prisma.workspaceInvitation.findFirst({
      where: {
        workspaceId: access.workspace.id,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!invite) {
      invite = await prisma.workspaceInvitation.create({
        data: {
          token: randomBytes(24).toString("base64url"),
          workspaceId: access.workspace.id,
          createdById: access.workspace.user.id,
          expiresAt: new Date(Date.now() + INVITE_TTL_MS),
          defaultAccess: WorkspaceAccess.FULL,
        },
      });
      revalidatePath("/settings/members");
    }

    const active = toActiveInvite(invite);
    const acceptUrl = `${getAppBaseUrl()}/invite/${active.token}`;
    const workspaceName = access.workspace.name;
    const inviter =
      access.workspace.user.name?.trim() || access.workspace.user.email;

    const sent = await sendEmail({
      to: email,
      subject: `Join ${workspaceName} on Planogram`,
      text: `${inviter} invited you to join “${workspaceName}” on Planogram.\n\nAccept: ${acceptUrl}\n\nThis link expires ${active.expiresAt.toUTCString()}.`,
      html: `<p><strong>${escapeHtml(inviter)}</strong> invited you to join <strong>${escapeHtml(workspaceName)}</strong> on Planogram.</p><p><a href="${acceptUrl}">Accept invite</a></p><p style="color:#666;font-size:12px">Or paste this link: ${acceptUrl}</p><p style="color:#666;font-size:12px">Expires ${escapeHtml(active.expiresAt.toUTCString())}.</p>`,
    });

    if (!sent.ok) {
      return { ok: false, message: sent.message };
    }

    return { ok: true, data: { invite: active, emailedTo: email } };
  } catch (error) {
    console.error("[sendInviteEmail]", error);
    return { ok: false, message: "Failed to send invite email." };
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
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

export type AcceptInviteResult = {
  workspaceId: string;
  workspaceName: string;
  alreadyMember: boolean;
  /** True when the joined workspace is already the user's active workspace. */
  isJoinedActive: boolean;
};

/**
 * Join a workspace via invite token.
 * Adds membership without removing others. Does **not** change the active
 * workspace (PLA-43 / PLA-48) — UI may offer an optional switch.
 */
export async function acceptInvite(input: {
  token: string;
}): Promise<ActionResult<AcceptInviteResult>> {
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

    const isJoinedActive = !shouldOfferSwitchToJoined({
      joinedWorkspaceId: invite.workspace.id,
      activeWorkspaceId: access.workspace.id,
    });

    if (existing) {
      return {
        ok: true,
        data: {
          workspaceId: invite.workspace.id,
          workspaceName: invite.workspace.name,
          alreadyMember: true,
          isJoinedActive,
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
    revalidatePath("/", "layout");

    return {
      ok: true,
      data: {
        workspaceId: invite.workspace.id,
        workspaceName: invite.workspace.name,
        alreadyMember: false,
        // Accept never auto-switches; active remains the pre-accept workspace.
        isJoinedActive: false,
      },
    };
  } catch (error) {
    console.error("[acceptInvite]", error);
    return { ok: false, message: "Failed to accept invite." };
  }
}

export async function getInvitePreview(token: string): Promise<
  ActionResult<{
    workspaceId: string;
    workspaceName: string;
    expired: boolean;
    alreadyMember: boolean;
    isJoinedActive: boolean;
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
    let isJoinedActive = false;

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

      if (alreadyMember) {
        const current = await getCurrentWorkspace();
        isJoinedActive = current
          ? !shouldOfferSwitchToJoined({
              joinedWorkspaceId: invite.workspace.id,
              activeWorkspaceId: current.id,
            })
          : false;
      }
    }

    return {
      ok: true,
      data: {
        workspaceId: invite.workspace.id,
        workspaceName: invite.workspace.name,
        expired: !active,
        alreadyMember,
        isJoinedActive,
      },
    };
  } catch (error) {
    console.error("[getInvitePreview]", error);
    return { ok: false, message: "Failed to load invite." };
  }
}
