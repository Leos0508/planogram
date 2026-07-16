import { describe, expect, it } from "vitest";
import {
  WorkspaceAccess,
  WorkspaceRole,
} from "@/generated/prisma/enums";
import {
  canManageMembers,
  canWriteWorkspace,
  isInvitationActive,
} from "../capabilities";

describe("canWriteWorkspace", () => {
  it("allows OWNER regardless of access", () => {
    expect(
      canWriteWorkspace({
        role: WorkspaceRole.OWNER,
        access: WorkspaceAccess.READ,
      }),
    ).toBe(true);
  });

  it("allows MEMBER with FULL", () => {
    expect(
      canWriteWorkspace({
        role: WorkspaceRole.MEMBER,
        access: WorkspaceAccess.FULL,
      }),
    ).toBe(true);
  });

  it("blocks MEMBER with READ", () => {
    expect(
      canWriteWorkspace({
        role: WorkspaceRole.MEMBER,
        access: WorkspaceAccess.READ,
      }),
    ).toBe(false);
  });
});

describe("canManageMembers", () => {
  it("allows only OWNER", () => {
    expect(
      canManageMembers({
        role: WorkspaceRole.OWNER,
        access: WorkspaceAccess.FULL,
      }),
    ).toBe(true);
    expect(
      canManageMembers({
        role: WorkspaceRole.MEMBER,
        access: WorkspaceAccess.FULL,
      }),
    ).toBe(false);
  });
});

describe("isInvitationActive", () => {
  const now = new Date("2026-07-16T12:00:00.000Z");

  it("rejects revoked or expired invites", () => {
    expect(
      isInvitationActive(
        {
          expiresAt: new Date("2026-07-20T12:00:00.000Z"),
          revokedAt: new Date("2026-07-15T12:00:00.000Z"),
        },
        now,
      ),
    ).toBe(false);
    expect(
      isInvitationActive(
        {
          expiresAt: new Date("2026-07-15T12:00:00.000Z"),
          revokedAt: null,
        },
        now,
      ),
    ).toBe(false);
  });

  it("accepts active invites", () => {
    expect(
      isInvitationActive(
        {
          expiresAt: new Date("2026-07-20T12:00:00.000Z"),
          revokedAt: null,
        },
        now,
      ),
    ).toBe(true);
  });
});
