import type {
  WorkspaceAccess,
  WorkspaceRole,
  WorkspaceTier,
} from "@/generated/prisma/client";

export type WorkspaceMembershipListItem = {
  id: string;
  name: string;
  slug: string | null;
  tier: WorkspaceTier;
  role: WorkspaceRole;
  access: WorkspaceAccess;
  isActive: boolean;
};

export type WorkspaceMembershipRow = {
  role: WorkspaceRole;
  access: WorkspaceAccess;
  workspace: {
    id: string;
    name: string;
    slug: string | null;
    tier: WorkspaceTier;
  };
};

/**
 * Stable list for the switcher: name (locale, case-insensitive), then id.
 * Marks the active membership when `activeWorkspaceId` is set.
 */
export function mapMembershipsToListItems(
  rows: WorkspaceMembershipRow[],
  activeWorkspaceId: string | null,
): WorkspaceMembershipListItem[] {
  return [...rows]
    .sort((a, b) => {
      const byName = a.workspace.name.localeCompare(b.workspace.name, undefined, {
        sensitivity: "base",
      });
      if (byName !== 0) return byName;
      return a.workspace.id.localeCompare(b.workspace.id);
    })
    .map((row) => ({
      id: row.workspace.id,
      name: row.workspace.name,
      slug: row.workspace.slug,
      tier: row.workspace.tier,
      role: row.role,
      access: row.access,
      isActive: row.workspace.id === activeWorkspaceId,
    }));
}
