import { WorkspaceRole, WorkspaceTier } from "@/generated/prisma/enums";

/** Free tier planogram cap (Plan 01 D28). */
export const MAX_FREE_PLANOGRAMS = 20;

/** Owned-workspace hard-cap when user owns zero Unlimited workspaces (D29). */
export const MAX_OWNED_WORKSPACES_HARD = 3;

/** @deprecated Use MAX_OWNED_WORKSPACES_HARD — kept for existing imports. */
export const MAX_OWNED_WORKSPACES_SOFT = MAX_OWNED_WORKSPACES_HARD;

export function canCreatePlanogramOnTier(
  tier: WorkspaceTier,
  planogramCount: number,
  limit: number = MAX_FREE_PLANOGRAMS,
): boolean {
  if (tier === WorkspaceTier.UNLIMITED) return true;
  return planogramCount < limit;
}

export function freePlanogramLimitMessage(
  limit: number = MAX_FREE_PLANOGRAMS,
): string {
  return `Free workspaces can have at most ${limit} planograms. Upgrade to Unlimited for more.`;
}

/**
 * Owned-workspace create is allowed when under the hard-cap, or when the user
 * already owns ≥1 Unlimited workspace (cap lifted).
 */
export function canOwnAnotherWorkspace(
  ownedCount: number,
  ownsUnlimitedWorkspace: boolean = false,
  limit: number = MAX_OWNED_WORKSPACES_HARD,
): boolean {
  if (ownsUnlimitedWorkspace) return true;
  return ownedCount < limit;
}

export function ownedWorkspaceLimitMessage(
  limit: number = MAX_OWNED_WORKSPACES_HARD,
): string {
  return `You can own at most ${limit} workspaces on the free plan. Upgrade a workspace to Unlimited to create more.`;
}

/** Count OWNER memberships (used to preempt create in the switcher). */
export function countOwnedWorkspaces(
  memberships: ReadonlyArray<{ role: WorkspaceRole }>,
): number {
  return memberships.filter((m) => m.role === WorkspaceRole.OWNER).length;
}

/** True when the user owns at least one Unlimited workspace. */
export function ownsUnlimitedWorkspace(
  memberships: ReadonlyArray<{ role: WorkspaceRole; tier: WorkspaceTier }>,
): boolean {
  return memberships.some(
    (m) =>
      m.role === WorkspaceRole.OWNER && m.tier === WorkspaceTier.UNLIMITED,
  );
}

/** Active Stripe subscription statuses that grant Unlimited. */
export function isActiveSubscriptionStatus(
  status: string | null | undefined,
): boolean {
  return status === "active" || status === "trialing";
}

export function tierFromSubscriptionStatus(
  status: string | null | undefined,
): WorkspaceTier {
  return isActiveSubscriptionStatus(status)
    ? WorkspaceTier.UNLIMITED
    : WorkspaceTier.FREE;
}
