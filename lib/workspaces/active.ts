/** Cookie that stores the signed-in user's active workspace id. */
export const ACTIVE_WORKSPACE_COOKIE = "planogram.active_workspace";

export const ACTIVE_WORKSPACE_COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 365;

/**
 * Pick the active workspace from cookie → DB preference → oldest membership.
 * Invalid preferences (not in memberships) are ignored.
 */
export function resolveActiveWorkspaceId(input: {
  cookieWorkspaceId?: string | null;
  dbWorkspaceId?: string | null;
  /** Membership workspace ids, oldest first (fallback order). */
  membershipWorkspaceIds: string[];
}): string | null {
  const memberships = new Set(input.membershipWorkspaceIds);

  if (
    input.cookieWorkspaceId &&
    memberships.has(input.cookieWorkspaceId)
  ) {
    return input.cookieWorkspaceId;
  }

  if (input.dbWorkspaceId && memberships.has(input.dbWorkspaceId)) {
    return input.dbWorkspaceId;
  }

  return input.membershipWorkspaceIds[0] ?? null;
}

export function activeWorkspaceCookieOptions(secure: boolean) {
  return {
    httpOnly: true as const,
    sameSite: "lax" as const,
    secure,
    path: "/",
    maxAge: ACTIVE_WORKSPACE_COOKIE_MAX_AGE_SEC,
  };
}
