import { describe, expect, it } from "vitest";
import {
  buildPackagingMesh,
  meshBounds,
  shoulderArchHeightMm,
} from "@/lib/skus/packaging-mesh";
import type { SkuPackaging } from "@/lib/skus/packaging";

const sampleCan: SkuPackaging = {
  shape: "CAN",
  bodyDiameterMm: 66,
  heightMm: 115,
  endDiameterMm: 65,
  baseDiameterMm: 64,
  capacityMl: 330,
};

const sampleBottle: SkuPackaging = {
  shape: "BOTTLE",
  bodyDiameterMm: 65,
  heightMm: 210,
  neckDiameterMm: 28,
  baseDiameterMm: 60,
};

describe("shoulderArchHeightMm", () => {
  it("equals body diameter minus lid diameter", () => {
    expect(shoulderArchHeightMm(66, 65)).toBe(1);
    expect(shoulderArchHeightMm(66, 64)).toBe(2);
  });

  it("is zero when lid is not smaller than body", () => {
    expect(shoulderArchHeightMm(66, 66)).toBe(0);
    expect(shoulderArchHeightMm(66, 70)).toBe(0);
  });
});

describe("buildPackagingMesh", () => {
  it("builds a can with body×height bounds and top rim at full height", () => {
    const mesh = buildPackagingMesh(sampleCan, { radialSegments: 12 });
    const bounds = meshBounds(mesh);

    expect(mesh.vertices.length % 3).toBe(0);
    expect(mesh.indices.length % 3).toBe(0);
    expect(mesh.indices.length).toBeGreaterThan(0);

    expect(bounds.minY).toBeCloseTo(0, 5);
    expect(bounds.maxY).toBeCloseTo(115, 5);
    expect(bounds.maxX - bounds.minX).toBeCloseTo(66, 5);
    expect(bounds.maxZ - bounds.minZ).toBeCloseTo(66, 5);
  });

  it("uses diameter-difference arches and a recessed top center", () => {
    const mesh = buildPackagingMesh(sampleCan, { radialSegments: 12 });
    const topArch = shoulderArchHeightMm(66, 65); // 1
    const baseArch = shoulderArchHeightMm(66, 64); // 2

    // Rim stays at full height with end radius.
    const rimRadii: number[] = [];
    for (let i = 0; i < mesh.vertices.length; i += 3) {
      const y = mesh.vertices[i + 1]!;
      if (Math.abs(y - 115) > 1e-6) continue;
      const r = Math.hypot(mesh.vertices[i]!, mesh.vertices[i + 2]!);
      if (r > 1e-6) rimRadii.push(r);
    }
    expect(rimRadii.some((r) => Math.abs(r - 32.5) < 1e-6)).toBe(true);

    // Top center (r≈0) is indented below the rim by up to half the top arch.
    let topCenterY = -Infinity;
    for (let i = 0; i < mesh.vertices.length; i += 3) {
      const r = Math.hypot(mesh.vertices[i]!, mesh.vertices[i + 2]!);
      if (r > 1e-6) continue;
      const y = mesh.vertices[i + 1]!;
      if (y > topCenterY) topCenterY = y;
    }
    expect(topCenterY).toBeLessThan(115);
    expect(topCenterY).toBeGreaterThanOrEqual(115 - topArch * 0.5 - 1e-6);

    // Body cylinder exists between base and top arches.
    const bodyYs: number[] = [];
    for (let i = 0; i < mesh.vertices.length; i += 3) {
      const r = Math.hypot(mesh.vertices[i]!, mesh.vertices[i + 2]!);
      if (Math.abs(r - 33) > 1e-6) continue;
      bodyYs.push(mesh.vertices[i + 1]!);
    }
    expect(Math.min(...bodyYs)).toBeCloseTo(baseArch, 5);
    expect(Math.max(...bodyYs)).toBeCloseTo(115 - topArch, 5);
  });

  it("builds a taller bottle with a narrower neck top", () => {
    const mesh = buildPackagingMesh(sampleBottle, { radialSegments: 12 });
    const bounds = meshBounds(mesh);

    expect(bounds.minY).toBeCloseTo(0, 5);
    expect(bounds.maxY).toBeCloseTo(210, 5);
    expect(bounds.maxX - bounds.minX).toBeCloseTo(65, 5);

    const topY = 210;
    const topRadii: number[] = [];
    for (let i = 0; i < mesh.vertices.length; i += 3) {
      const y = mesh.vertices[i + 1]!;
      if (Math.abs(y - topY) > 1e-9) continue;
      const x = mesh.vertices[i]!;
      const z = mesh.vertices[i + 2]!;
      const r = Math.hypot(x, z);
      if (r > 1e-6) topRadii.push(r);
    }
    expect(topRadii.length).toBe(12);
    for (const r of topRadii) {
      expect(r).toBeCloseTo(14, 5);
    }

    expect(mesh.vertices.length / 3).toBe(6 * 12 + 2);
  });

  it("can and bottle differ in topology at the same radial resolution", () => {
    const can = buildPackagingMesh(sampleCan, { radialSegments: 10 });
    const bottle = buildPackagingMesh(sampleBottle, { radialSegments: 10 });
    expect(can.vertices.length).not.toBe(bottle.vertices.length);
  });

  it("index references stay in range", () => {
    const mesh = buildPackagingMesh(sampleCan, { radialSegments: 8 });
    const vertexCount = mesh.vertices.length / 3;
    for (const index of mesh.indices) {
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(vertexCount);
    }
  });
});
