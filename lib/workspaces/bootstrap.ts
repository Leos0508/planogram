import type { PrismaClient } from "@/generated/prisma/client";
import { WorkspaceRole, WorkspaceTier } from "@/generated/prisma/client";
import { seedCatalogForWorkspace } from "@/lib/skus/seed-catalog";

export type WorkspaceBootstrapInput = {
  userId: string;
  name?: string | null;
  email: string;
};

/** Build a display name for a new personal workspace. */
export function workspaceNameForUser(input: {
  name?: string | null;
  email: string;
}): string {
  const trimmed = input.name?.trim();
  if (trimmed) {
    return `${trimmed}'s workspace`;
  }
  const local = input.email.split("@")[0]?.trim();
  if (local) {
    return `${local}'s workspace`;
  }
  return "My workspace";
}

/** Slugify a workspace name; returns null when empty after normalization. */
export function slugifyWorkspaceName(name: string): string | null {
  const slug = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return slug.length > 0 ? slug : null;
}

/**
 * Create a FREE workspace and OWNER membership for a newly registered user.
 * Idempotent if the user already has a membership.
 */
export async function createWorkspaceForUser(
  db: PrismaClient,
  input: WorkspaceBootstrapInput,
) {
  const existing = await db.workspaceMember.findFirst({
    where: { userId: input.userId },
    include: { workspace: true },
    orderBy: { createdAt: "asc" },
  });

  if (existing) {
    return existing.workspace;
  }

  const name = workspaceNameForUser(input);
  const baseSlug = slugifyWorkspaceName(name) ?? `ws-${input.userId.slice(0, 8)}`;
  const slug = `${baseSlug}-${input.userId.slice(0, 8)}`;

  const workspace = await db.workspace.create({
    data: {
      name,
      slug,
      tier: WorkspaceTier.FREE,
      members: {
        create: {
          userId: input.userId,
          role: WorkspaceRole.OWNER,
        },
      },
    },
  });

  await db.user.update({
    where: { id: input.userId },
    data: { activeWorkspaceId: workspace.id },
  });

  await seedCatalogForWorkspace(db, workspace.id);

  return workspace;
}

/**
 * Resolve the user's primary workspace (oldest membership).
 * Creates a personal workspace if none exists (e.g. pre-migration edge cases).
 */
export async function getPrimaryWorkspaceId(
  db: PrismaClient,
  user: { id: string; name?: string | null; email: string },
): Promise<string> {
  const membership = await db.workspaceMember.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
    select: { workspaceId: true },
  });

  if (membership) {
    return membership.workspaceId;
  }

  const workspace = await createWorkspaceForUser(db, {
    userId: user.id,
    name: user.name,
    email: user.email,
  });
  return workspace.id;
}
