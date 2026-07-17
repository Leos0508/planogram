import { describe, expect, it } from "vitest";
import {
  WorkspaceAccess,
  WorkspaceRole,
  WorkspaceTier,
} from "@/generated/prisma/client";
import { mapMembershipsToListItems } from "../list";

const base = {
  role: WorkspaceRole.MEMBER,
  access: WorkspaceAccess.FULL,
} as const;

describe("mapMembershipsToListItems", () => {
  it("sorts by name case-insensitively, then id", () => {
    const items = mapMembershipsToListItems(
      [
        {
          ...base,
          workspace: {
            id: "b",
            name: "Zebra",
            slug: "zebra",
            tier: WorkspaceTier.FREE,
          },
        },
        {
          ...base,
          role: WorkspaceRole.OWNER,
          workspace: {
            id: "a",
            name: "alpha",
            slug: "alpha",
            tier: WorkspaceTier.UNLIMITED,
          },
        },
        {
          ...base,
          workspace: {
            id: "c",
            name: "Alpha",
            slug: "alpha-2",
            tier: WorkspaceTier.FREE,
          },
        },
      ],
      "a",
    );

    expect(items.map((i) => i.id)).toEqual(["a", "c", "b"]);
    expect(items[0]).toMatchObject({
      id: "a",
      name: "alpha",
      isActive: true,
      role: WorkspaceRole.OWNER,
      tier: WorkspaceTier.UNLIMITED,
    });
    expect(items[1]?.isActive).toBe(false);
    expect(items[2]?.isActive).toBe(false);
  });

  it("returns empty array when there are no memberships", () => {
    expect(mapMembershipsToListItems([], "ws-x")).toEqual([]);
  });

  it("marks no row active when active id is missing", () => {
    const items = mapMembershipsToListItems(
      [
        {
          ...base,
          workspace: {
            id: "ws-1",
            name: "One",
            slug: null,
            tier: WorkspaceTier.FREE,
          },
        },
      ],
      null,
    );
    expect(items).toHaveLength(1);
    expect(items[0]?.isActive).toBe(false);
  });
});
