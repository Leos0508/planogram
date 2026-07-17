import { cookies } from "next/headers";
import {
  ACTIVE_WORKSPACE_COOKIE,
  activeWorkspaceCookieOptions,
} from "@/lib/workspaces/active";

export async function readActiveWorkspaceCookie(): Promise<string | null> {
  const jar = await cookies();
  const value = jar.get(ACTIVE_WORKSPACE_COOKIE)?.value?.trim();
  return value && value.length > 0 ? value : null;
}

/** Set or clear the active-workspace cookie (Server Action / Route Handler only). */
export async function writeActiveWorkspaceCookie(
  workspaceId: string | null,
): Promise<void> {
  const jar = await cookies();
  const secure = process.env.NODE_ENV === "production";

  if (!workspaceId) {
    jar.delete(ACTIVE_WORKSPACE_COOKIE);
    return;
  }

  jar.set(
    ACTIVE_WORKSPACE_COOKIE,
    workspaceId,
    activeWorkspaceCookieOptions(secure),
  );
}
