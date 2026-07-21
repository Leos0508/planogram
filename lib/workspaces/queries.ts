import { cache } from "react";
import type { QueryResult } from "@/lib/result";
import { resolveActiveWorkspaceId } from "@/lib/workspaces/active";
import {
  mapMembershipsToListItems,
  type WorkspaceMembershipListItem,
} from "@/lib/workspaces/list";
import { getMembershipContext } from "@/lib/workspaces/membership-context";

export type { WorkspaceMembershipListItem };

/**
 * Memberships for the signed-in user (switcher). Ordered by workspace name.
 * Request-deduped; shares membership snapshot with `getCurrentWorkspace`.
 */
export const listMyWorkspaces = cache(
  async (): Promise<QueryResult<WorkspaceMembershipListItem[]>> => {
    try {
      const context = await getMembershipContext();
      if (!context.ok) {
        return { ok: false, code: "NOT_FOUND", message: context.message };
      }

      const { cookieWorkspaceId, dbWorkspaceId, memberships } = context.data;

      const activeWorkspaceId = resolveActiveWorkspaceId({
        cookieWorkspaceId,
        dbWorkspaceId,
        membershipWorkspaceIds: memberships.map((m) => m.workspace.id),
      });

      return {
        ok: true,
        data: mapMembershipsToListItems(memberships, activeWorkspaceId),
      };
    } catch (error) {
      console.error("[listMyWorkspaces]", error);
      return {
        ok: false,
        code: "DB_ERROR",
        message: "Failed to load workspaces.",
      };
    }
  },
);
