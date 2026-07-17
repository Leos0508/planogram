import { describe, expect, it } from "vitest";
import { catalogPathAfterSwitch } from "../switch-path";

describe("catalogPathAfterSwitch", () => {
  it("redirects away from workspace-scoped detail routes", () => {
    expect(catalogPathAfterSwitch("/planograms/abc")).toBe("/planograms");
    expect(catalogPathAfterSwitch("/skus/sku-1")).toBe("/planograms");
  });

  it("keeps list and settings routes (PLA-49: settings stay and refresh)", () => {
    expect(catalogPathAfterSwitch("/planograms")).toBeNull();
    expect(catalogPathAfterSwitch("/skus")).toBeNull();
    expect(catalogPathAfterSwitch("/settings")).toBeNull();
    expect(catalogPathAfterSwitch("/settings/members")).toBeNull();
    expect(catalogPathAfterSwitch("/settings/account")).toBeNull();
  });
});
