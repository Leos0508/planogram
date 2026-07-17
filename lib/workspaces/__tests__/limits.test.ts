import { describe, expect, it } from "vitest";
import { WorkspaceRole, WorkspaceTier } from "@/generated/prisma/enums";
import {
  MAX_FREE_PLANOGRAMS,
  MAX_OWNED_WORKSPACES_HARD,
  MAX_OWNED_WORKSPACES_SOFT,
  canCreatePlanogramOnTier,
  canOwnAnotherWorkspace,
  countOwnedWorkspaces,
  freePlanogramLimitMessage,
  ownedWorkspaceLimitMessage,
  ownsUnlimitedWorkspace,
  tierFromSubscriptionStatus,
} from "../limits";

describe("canOwnAnotherWorkspace", () => {
  it("allows create under the hard cap", () => {
    expect(canOwnAnotherWorkspace(0)).toBe(true);
    expect(canOwnAnotherWorkspace(MAX_OWNED_WORKSPACES_HARD - 1)).toBe(true);
  });

  it("blocks create at or above the hard cap without Unlimited", () => {
    expect(canOwnAnotherWorkspace(MAX_OWNED_WORKSPACES_HARD)).toBe(false);
    expect(canOwnAnotherWorkspace(MAX_OWNED_WORKSPACES_HARD + 1)).toBe(false);
  });

  it("lifts the cap when the user owns an Unlimited workspace", () => {
    expect(canOwnAnotherWorkspace(MAX_OWNED_WORKSPACES_HARD, true)).toBe(true);
    expect(canOwnAnotherWorkspace(10, true)).toBe(true);
  });

  it("keeps soft alias equal to hard cap", () => {
    expect(MAX_OWNED_WORKSPACES_SOFT).toBe(MAX_OWNED_WORKSPACES_HARD);
  });
});

describe("ownedWorkspaceLimitMessage", () => {
  it("mentions the limit and upgrade path", () => {
    expect(ownedWorkspaceLimitMessage(3)).toContain("3");
    expect(ownedWorkspaceLimitMessage(3)).toContain("Unlimited");
  });
});

describe("countOwnedWorkspaces", () => {
  it("counts OWNER memberships only", () => {
    expect(
      countOwnedWorkspaces([
        { role: WorkspaceRole.OWNER },
        { role: WorkspaceRole.MEMBER },
        { role: WorkspaceRole.OWNER },
      ]),
    ).toBe(2);
  });
});

describe("ownsUnlimitedWorkspace", () => {
  it("requires OWNER of an Unlimited workspace", () => {
    expect(
      ownsUnlimitedWorkspace([
        { role: WorkspaceRole.MEMBER, tier: WorkspaceTier.UNLIMITED },
        { role: WorkspaceRole.OWNER, tier: WorkspaceTier.FREE },
      ]),
    ).toBe(false);
    expect(
      ownsUnlimitedWorkspace([
        { role: WorkspaceRole.OWNER, tier: WorkspaceTier.UNLIMITED },
      ]),
    ).toBe(true);
  });
});

describe("canCreatePlanogramOnTier", () => {
  it("caps Free workspaces", () => {
    expect(canCreatePlanogramOnTier(WorkspaceTier.FREE, 0)).toBe(true);
    expect(
      canCreatePlanogramOnTier(WorkspaceTier.FREE, MAX_FREE_PLANOGRAMS - 1),
    ).toBe(true);
    expect(
      canCreatePlanogramOnTier(WorkspaceTier.FREE, MAX_FREE_PLANOGRAMS),
    ).toBe(false);
  });

  it("does not cap Unlimited workspaces", () => {
    expect(
      canCreatePlanogramOnTier(WorkspaceTier.UNLIMITED, MAX_FREE_PLANOGRAMS),
    ).toBe(true);
    expect(canCreatePlanogramOnTier(WorkspaceTier.UNLIMITED, 1000)).toBe(true);
  });
});

describe("freePlanogramLimitMessage", () => {
  it("mentions the free cap", () => {
    expect(freePlanogramLimitMessage()).toContain(String(MAX_FREE_PLANOGRAMS));
  });
});

describe("tierFromSubscriptionStatus", () => {
  it("maps active and trialing to Unlimited", () => {
    expect(tierFromSubscriptionStatus("active")).toBe(WorkspaceTier.UNLIMITED);
    expect(tierFromSubscriptionStatus("trialing")).toBe(
      WorkspaceTier.UNLIMITED,
    );
  });

  it("maps other statuses to Free", () => {
    expect(tierFromSubscriptionStatus("canceled")).toBe(WorkspaceTier.FREE);
    expect(tierFromSubscriptionStatus("past_due")).toBe(WorkspaceTier.FREE);
    expect(tierFromSubscriptionStatus(null)).toBe(WorkspaceTier.FREE);
  });
});
