import {
  WorkspaceAccess,
  WorkspaceRole,
} from "@/generated/prisma/enums";

export type MembershipCapability = {
  role: WorkspaceRole;
  access: WorkspaceAccess;
};

/** Inline hint when write controls are disabled for READ members. */
export const WORKSPACE_READ_ONLY_HINT =
  "You have read-only access to this workspace.";

/** OWNER always writes; MEMBER writes only with FULL access. */
export function canWriteWorkspace(member: MembershipCapability): boolean {
  if (member.role === WorkspaceRole.OWNER) return true;
  return member.access === WorkspaceAccess.FULL;
}

/** Only OWNER manages invites and member access. */
export function canManageMembers(member: MembershipCapability): boolean {
  return member.role === WorkspaceRole.OWNER;
}

export function isInvitationActive(
  invite: {
    expiresAt: Date;
    revokedAt: Date | null;
  },
  now: Date = new Date(),
): boolean {
  if (invite.revokedAt) return false;
  return invite.expiresAt.getTime() > now.getTime();
}
