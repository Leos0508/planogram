import { describe, expect, it } from "vitest";
import {
  deriveFaceOnMm,
  packagingFromFaceOn,
  parseSkuPackaging,
  readStoredPackaging,
  resolveSkuDimensions,
} from "@/lib/skus/packaging";

describe("deriveFaceOnMm", () => {
  it("rounds body diameter × height to face-on mm", () => {
    expect(
      deriveFaceOnMm({
        shape: "CAN",
        bodyDiameterMm: 65.6,
        heightMm: 115.4,
        endDiameterMm: 65,
        baseDiameterMm: 65,
        capacityMl: 330,
      }),
    ).toEqual({ width: 66, height: 115 });
  });
});

describe("packagingFromFaceOn", () => {
  it("builds a can payload that preserves face-on mm", () => {
    const packaging = packagingFromFaceOn("CAN", { width: 66, height: 115 }, 330);
    expect(packaging).toMatchObject({
      shape: "CAN",
      bodyDiameterMm: 66,
      heightMm: 115,
      endDiameterMm: 65,
      baseDiameterMm: 64,
      capacityMl: 330,
    });
    expect(deriveFaceOnMm(packaging)).toEqual({ width: 66, height: 115 });
    expect(parseSkuPackaging("CAN", packaging).ok).toBe(true);
  });

  it("builds a bottle payload with neck smaller than body", () => {
    const packaging = packagingFromFaceOn(
      "BOTTLE",
      { width: 65, height: 210 },
      500,
    );
    expect(packaging.shape).toBe("BOTTLE");
    if (packaging.shape !== "BOTTLE") return;
    expect(packaging.neckDiameterMm).toBeLessThan(packaging.bodyDiameterMm);
    expect(packaging.neckDiameterMm).toBeLessThanOrEqual(28);
    expect(deriveFaceOnMm(packaging)).toEqual({ width: 65, height: 210 });
    expect(parseSkuPackaging("BOTTLE", packaging).ok).toBe(true);
  });
});

describe("parseSkuPackaging", () => {
  it("accepts a valid can and derives face-on dims", () => {
    const result = parseSkuPackaging("CAN", {
      bodyDiameterMm: 66,
      heightMm: 115,
      endDiameterMm: 65,
      baseDiameterMm: 64,
      capacityMl: 330,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.shape).toBe("CAN");
    expect(result.face).toEqual({ width: 66, height: 115 });
  });

  it("accepts a valid bottle without capacity", () => {
    const result = parseSkuPackaging("BOTTLE", {
      bodyDiameterMm: 65,
      heightMm: 210,
      neckDiameterMm: 28,
      baseDiameterMm: 60,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toMatchObject({
      shape: "BOTTLE",
      bodyDiameterMm: 65,
      neckDiameterMm: 28,
    });
    expect("capacityMl" in result.data).toBe(false);
  });

  it("rejects zero or negative dimensions", () => {
    expect(
      parseSkuPackaging("CAN", {
        bodyDiameterMm: 0,
        heightMm: 115,
        endDiameterMm: 65,
        baseDiameterMm: 65,
      }).ok,
    ).toBe(false);
    expect(
      parseSkuPackaging("BOTTLE", {
        bodyDiameterMm: 65,
        heightMm: -1,
        neckDiameterMm: 28,
        baseDiameterMm: 60,
      }).ok,
    ).toBe(false);
  });

  it("rejects can lid larger than body", () => {
    const result = parseSkuPackaging("CAN", {
      bodyDiameterMm: 66,
      heightMm: 115,
      endDiameterMm: 70,
      baseDiameterMm: 64,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toMatch(/end\/lid/i);
  });

  it("rejects bottle neck >= body", () => {
    const result = parseSkuPackaging("BOTTLE", {
      bodyDiameterMm: 65,
      heightMm: 210,
      neckDiameterMm: 65,
      baseDiameterMm: 60,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toMatch(/neck/i);
  });

  it("rejects invalid capacity", () => {
    const result = parseSkuPackaging("CAN", {
      bodyDiameterMm: 66,
      heightMm: 115,
      endDiameterMm: 65,
      baseDiameterMm: 64,
      capacityMl: 0,
    });
    expect(result.ok).toBe(false);
  });

  it("rejects unknown shape or missing packaging", () => {
    expect(parseSkuPackaging("SQUARE", { bodyDiameterMm: 1 }).ok).toBe(false);
    expect(parseSkuPackaging("CAN", null).ok).toBe(false);
  });
});

describe("resolveSkuDimensions", () => {
  it("keeps flat width/height when shape and packaging are absent", () => {
    const result = resolveSkuDimensions({ width: 80.2, height: 120.8 });
    expect(result).toEqual({
      ok: true,
      width: 80,
      height: 121,
      shape: null,
      packaging: null,
    });
  });

  it("derives face-on from packaging and stores payload without shape", () => {
    const result = resolveSkuDimensions({
      width: 1,
      height: 1,
      shape: "CAN",
      packaging: {
        bodyDiameterMm: 53,
        heightMm: 134,
        endDiameterMm: 53,
        baseDiameterMm: 52,
        capacityMl: 250,
      },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.width).toBe(53);
    expect(result.height).toBe(134);
    expect(result.shape).toBe("CAN");
    expect(result.packaging).toEqual({
      bodyDiameterMm: 53,
      heightMm: 134,
      endDiameterMm: 53,
      baseDiameterMm: 52,
      capacityMl: 250,
    });
  });

  it("rejects shape without packaging and vice versa", () => {
    expect(
      resolveSkuDimensions({ width: 10, height: 10, shape: "CAN" }).ok,
    ).toBe(false);
    expect(
      resolveSkuDimensions({
        width: 10,
        height: 10,
        packaging: { bodyDiameterMm: 10 },
      }).ok,
    ).toBe(false);
  });

  it("rejects invalid flat footprint", () => {
    expect(resolveSkuDimensions({ width: 0, height: 10 }).ok).toBe(false);
  });
});

describe("readStoredPackaging", () => {
  it("returns typed packaging for valid stored rows", () => {
    expect(
      readStoredPackaging("BOTTLE", {
        bodyDiameterMm: 80,
        heightMm: 270,
        neckDiameterMm: 30,
        baseDiameterMm: 70,
        capacityMl: 1000,
      }),
    ).toMatchObject({ shape: "BOTTLE", bodyDiameterMm: 80 });
  });

  it("returns null for flat or corrupt rows", () => {
    expect(readStoredPackaging(null, null)).toBeNull();
    expect(readStoredPackaging("CAN", { bodyDiameterMm: -1 })).toBeNull();
  });
});
