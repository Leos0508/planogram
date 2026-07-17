import type { PrismaClient } from "@/generated/prisma/client";
import { WorkspaceRole } from "@/generated/prisma/client";

type Tx = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends"
>;

/** Cascade-delete a workspace and all planogram/SKU/invite/member rows. */
export async function deleteWorkspaceDeep(tx: Tx, workspaceId: string) {
  const planograms = await tx.planogram.findMany({
    where: { workspaceId },
    select: { id: true },
  });
  const planogramIds = planograms.map((planogram) => planogram.id);

  const shelves = await tx.planogramShelf.findMany({
    where: { planogramId: { in: planogramIds } },
    select: { id: true },
  });
  const shelfIds = shelves.map((shelf) => shelf.id);

  if (shelfIds.length > 0) {
    await tx.planogramItem.deleteMany({
      where: { planogramShelfId: { in: shelfIds } },
    });
    await tx.planogramShelf.deleteMany({
      where: { id: { in: shelfIds } },
    });
  }

  await tx.planogram.deleteMany({ where: { workspaceId } });
  await tx.sKU.deleteMany({ where: { workspaceId } });
  await tx.workspaceInvitation.deleteMany({ where: { workspaceId } });
  await tx.workspaceMember.deleteMany({ where: { workspaceId } });
  await tx.workspace.delete({ where: { id: workspaceId } });
}

export type LeaveDecision =
  | { action: "remove_membership" }
  | { action: "delete_workspace" }
  | { action: "blocked_transfer"; otherMemberCount: number };

/** Decide leave outcome from role + remaining other members. */
export function decideLeaveAction(input: {
  role: WorkspaceRole;
  otherMemberCount: number;
}): LeaveDecision {
  if (input.role === WorkspaceRole.OWNER) {
    if (input.otherMemberCount > 0) {
      return {
        action: "blocked_transfer",
        otherMemberCount: input.otherMemberCount,
      };
    }
    return { action: "delete_workspace" };
  }
  return { action: "remove_membership" };
}

export function leaveBlockedTransferMessage(): string {
  return "Transfer ownership to another member before leaving this workspace.";
}
