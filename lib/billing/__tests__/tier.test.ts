import { describe, expect, it } from "vitest";
import { WorkspaceTier } from "@/generated/prisma/enums";
import { tierFromSubscriptionStatus } from "@/lib/workspaces/limits";

describe("billing tier sync helpers", () => {
  it("treats active subscription as Unlimited", () => {
    expect(tierFromSubscriptionStatus("active")).toBe(WorkspaceTier.UNLIMITED);
  });
});
