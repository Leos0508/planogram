import { matchesDeleteConfirmation } from "@/lib/account/deletion";

export type DeleteWorkspaceDecision =
  | { action: "delete" }
  | { action: "blocked_members"; otherMemberCount: number };

/** OWNER-only; block while other members remain. */
export function decideDeleteWorkspaceAction(input: {
  isOwner: boolean;
  otherMemberCount: number;
}): DeleteWorkspaceDecision | { action: "forbidden" } {
  if (!input.isOwner) {
    return { action: "forbidden" };
  }
  if (input.otherMemberCount > 0) {
    return {
      action: "blocked_members",
      otherMemberCount: input.otherMemberCount,
    };
  }
  return { action: "delete" };
}

export function deleteWorkspaceBlockedMembersMessage(): string {
  return "Remove or transfer other members before deleting this workspace.";
}

export function deleteWorkspaceForbiddenMessage(): string {
  return "Only the workspace owner can delete this workspace.";
}

export function deleteWorkspaceConfirmationMismatchMessage(): string {
  return "Type the workspace name exactly to confirm deletion.";
}

/** Confirm by typing the workspace name (case-insensitive trim). */
export function matchesWorkspaceDeleteConfirmation(
  confirmation: string,
  workspaceName: string,
): boolean {
  return matchesDeleteConfirmation(confirmation, workspaceName);
}
