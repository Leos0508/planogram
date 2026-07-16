import { WorkspaceRole } from "@/generated/prisma/enums";

export type OwnedWorkspaceSnapshot = {
  workspaceId: string;
  workspaceName: string;
  role: WorkspaceRole;
  otherMemberCount: number;
};

/** OWNER workspaces that still have other members — must transfer before delete. */
export function blockingOwnedWorkspaces(
  owned: OwnedWorkspaceSnapshot[],
): OwnedWorkspaceSnapshot[] {
  return owned.filter(
    (workspace) =>
      workspace.role === WorkspaceRole.OWNER && workspace.otherMemberCount > 0,
  );
}

/** OWNER workspaces with no other members — safe to cascade-delete with the user. */
export function soleOwnedWorkspaces(
  owned: OwnedWorkspaceSnapshot[],
): OwnedWorkspaceSnapshot[] {
  return owned.filter(
    (workspace) =>
      workspace.role === WorkspaceRole.OWNER && workspace.otherMemberCount === 0,
  );
}

export function normalizeDeleteConfirmation(value: string): string {
  return value.trim().toLowerCase();
}

export function matchesDeleteConfirmation(
  confirmation: string,
  email: string,
): boolean {
  return (
    normalizeDeleteConfirmation(confirmation) ===
    normalizeDeleteConfirmation(email)
  );
}
