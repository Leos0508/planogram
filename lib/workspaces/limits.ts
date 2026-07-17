/** Soft cap on how many workspaces a user may own before S5 billing. */
export const MAX_OWNED_WORKSPACES_SOFT = 3;

export function canOwnAnotherWorkspace(
  ownedCount: number,
  limit: number = MAX_OWNED_WORKSPACES_SOFT,
): boolean {
  return ownedCount < limit;
}

export function ownedWorkspaceLimitMessage(
  limit: number = MAX_OWNED_WORKSPACES_SOFT,
): string {
  return `You can own at most ${limit} workspaces on the free plan.`;
}
