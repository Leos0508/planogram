/**
 * Low-poly packaging mesh from parametric can/bottle specs (Plan 02 S3 / PLA-87).
 * Pure TS — units are millimeters; Y is up; origin at the package base center.
 */

import type { SkuPackaging } from "@/lib/skus/packaging";

export type PackagingMesh = {
  /** Interleaved XYZ positions in mm. */
  vertices: number[];
  /** Triangle indices (CCW when viewed from outside). */
  indices: number[];
};

export type PackagingMeshOptions = {
  /** Circumference segments (low-poly default). */
  radialSegments?: number;
};

type ProfileRing = { y: number; radius: number };

const DEFAULT_RADIAL_SEGMENTS = 12;
/** Samples along each body→lid quarter-ellipse (excluding the shared body endpoint). */
const ARCH_SAMPLES = 6;
/**
 * Minimum shoulder arch height as a fraction of body diameter so tiny ΔD
 * (seed cans often 1–2 mm) still reads as a shoulder.
 */
const ARCH_HEIGHT_FLOOR_FRAC = 0.06;
/** Top indent depth relative to the top arch height. */
const INDENT_DEPTH_FRAC = 0.9;
const INDENT_INNER_RIM_FRAC = 0.94;
const INDENT_WELL_FRAC = 0.68;
const INDENT_CENTER_FRAC = 0.28;

function clampSegments(value: number | undefined): number {
  if (value == null || !Number.isFinite(value)) return DEFAULT_RADIAL_SEGMENTS;
  return Math.max(3, Math.min(64, Math.round(value)));
}

/**
 * Vertical height (mm) of the shoulder arch from body to a lid.
 * Uses Δdiameter, floored so small lid deltas still read as a shoulder.
 */
export function shoulderArchHeightMm(
  bodyDiameterMm: number,
  lidDiameterMm: number,
): number {
  const delta = Math.max(0, bodyDiameterMm - lidDiameterMm);
  if (delta <= 0) return 0;
  return Math.max(delta, bodyDiameterMm * ARCH_HEIGHT_FLOOR_FRAC);
}

/** Axis-aligned extents of a mesh in mm (for tests / framing). */
export function meshBounds(mesh: PackagingMesh): {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
} {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (let i = 0; i < mesh.vertices.length; i += 3) {
    const x = mesh.vertices[i]!;
    const y = mesh.vertices[i + 1]!;
    const z = mesh.vertices[i + 2]!;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
    if (z < minZ) minZ = z;
    if (z > maxZ) maxZ = z;
  }
  return { minX, maxX, minY, maxY, minZ, maxZ };
}

/**
 * Quarter-ellipse from a larger body radius down to a smaller lid radius.
 * Horizontal semi-axis = Δradius; vertical semi-axis = archHeight.
 */
function appendNeckArch(
  rings: ProfileRing[],
  args: {
    bodyRadius: number;
    lidRadius: number;
    yBody: number;
    archHeight: number;
    /** When true, omit the first sample (already on the body cylinder). */
    skipBodyEndpoint: boolean;
  },
): void {
  const { bodyRadius, lidRadius, yBody, archHeight, skipBodyEndpoint } = args;
  if (archHeight <= 0 || bodyRadius <= lidRadius) {
    if (!skipBodyEndpoint) {
      rings.push({ y: yBody, radius: bodyRadius });
    }
    rings.push({ y: yBody + archHeight, radius: lidRadius });
    return;
  }

  const deltaR = bodyRadius - lidRadius;
  for (let i = skipBodyEndpoint ? 1 : 0; i <= ARCH_SAMPLES; i++) {
    const theta = (i / ARCH_SAMPLES) * (Math.PI / 2);
    rings.push({
      y: yBody + archHeight * Math.sin(theta),
      radius: lidRadius + deltaR * Math.cos(theta),
    });
  }
}

/**
 * Quarter-ellipse from a smaller base lid up to the body radius.
 */
function appendBaseArch(
  rings: ProfileRing[],
  args: {
    bodyRadius: number;
    baseRadius: number;
    archHeight: number;
  },
): void {
  const { bodyRadius, baseRadius, archHeight } = args;
  if (archHeight <= 0 || bodyRadius <= baseRadius) {
    rings.push({ y: 0, radius: baseRadius });
    rings.push({ y: archHeight, radius: bodyRadius });
    return;
  }

  const deltaR = bodyRadius - baseRadius;
  for (let i = 0; i <= ARCH_SAMPLES; i++) {
    const theta = (i / ARCH_SAMPLES) * (Math.PI / 2);
    // θ=0 at base lid, θ=π/2 at body.
    rings.push({
      y: archHeight * Math.sin(theta),
      radius: bodyRadius - deltaR * Math.cos(theta),
    });
  }
}

/**
 * Recessed top dish inside the end lid when body is wider than the end.
 * Depth scales with the top shoulder arch height.
 */
function appendTopIndent(
  rings: ProfileRing[],
  args: {
    endRadius: number;
    rimY: number;
    archHeight: number;
    canHeight: number;
  },
): void {
  const { endRadius, rimY, archHeight, canHeight } = args;
  if (archHeight <= 0 || endRadius <= 0) return;

  const maxDepth = Math.max(0, rimY - canHeight * 0.12);
  const indentDepth = Math.min(archHeight * INDENT_DEPTH_FRAC, maxDepth, endRadius);
  if (indentDepth <= 0) return;

  const innerRim = endRadius * INDENT_INNER_RIM_FRAC;
  const wellRadius = endRadius * INDENT_WELL_FRAC;
  rings.push({ y: rimY, radius: innerRim });
  rings.push({ y: rimY - indentDepth * 0.55, radius: wellRadius });
  // Center vertex sits at this last ring's Y (dish floor).
  rings.push({ y: rimY - indentDepth, radius: wellRadius * INDENT_CENTER_FRAC });
}

function canProfile(packaging: Extract<SkuPackaging, { shape: "CAN" }>): ProfileRing[] {
  const h = packaging.heightMm;
  const bodyD = packaging.bodyDiameterMm;
  const bodyR = bodyD / 2;
  const endR = packaging.endDiameterMm / 2;
  const baseR = packaging.baseDiameterMm / 2;

  let baseArch = shoulderArchHeightMm(bodyD, packaging.baseDiameterMm);
  let topArch = shoulderArchHeightMm(bodyD, packaging.endDiameterMm);

  // Keep a usable straight body when arches are large vs height.
  const archBudget = h * 0.85;
  const archSum = baseArch + topArch;
  if (archSum > archBudget && archSum > 0) {
    const scale = archBudget / archSum;
    baseArch *= scale;
    topArch *= scale;
  }

  const rings: ProfileRing[] = [];
  appendBaseArch(rings, {
    bodyRadius: bodyR,
    baseRadius: baseR,
    archHeight: baseArch,
  });

  const yBodyTop = h - topArch;
  // Straight body wall between shoulder arches.
  if (yBodyTop > rings[rings.length - 1]!.y + 1e-6) {
    rings.push({ y: yBodyTop, radius: bodyR });
  }

  appendNeckArch(rings, {
    bodyRadius: bodyR,
    lidRadius: endR,
    yBody: yBodyTop,
    archHeight: topArch,
    skipBodyEndpoint: true,
  });

  appendTopIndent(rings, {
    endRadius: endR,
    rimY: h,
    archHeight: topArch,
    canHeight: h,
  });

  return rings;
}

function bottleProfile(
  packaging: Extract<SkuPackaging, { shape: "BOTTLE" }>,
): ProfileRing[] {
  const h = packaging.heightMm;
  const bodyD = packaging.bodyDiameterMm;
  const bodyR = bodyD / 2;
  const neckR = packaging.neckDiameterMm / 2;
  const baseR = packaging.baseDiameterMm / 2;

  let baseArch = shoulderArchHeightMm(bodyD, packaging.baseDiameterMm);
  let shoulderArch = shoulderArchHeightMm(bodyD, packaging.neckDiameterMm);

  const neckCylinder = Math.min(h * 0.12, Math.max(8, h * 0.08));
  const yShoulderTop = h - neckCylinder;

  // Scale arches if they crowd the bottle height.
  const usable = Math.max(1, yShoulderTop - 1);
  if (baseArch + shoulderArch > usable * 0.9) {
    const scale = (usable * 0.9) / (baseArch + shoulderArch);
    baseArch *= scale;
    shoulderArch *= scale;
  }

  const rings: ProfileRing[] = [];
  appendBaseArch(rings, {
    bodyRadius: bodyR,
    baseRadius: baseR,
    archHeight: baseArch,
  });

  const bodyTop = Math.max(baseArch + 1, yShoulderTop - shoulderArch);
  if (bodyTop > rings[rings.length - 1]!.y + 1e-6) {
    rings.push({ y: bodyTop, radius: bodyR });
  }

  appendNeckArch(rings, {
    bodyRadius: bodyR,
    lidRadius: neckR,
    yBody: bodyTop,
    archHeight: Math.max(0, yShoulderTop - bodyTop),
    skipBodyEndpoint: true,
  });

  // Straight neck finish.
  if (h > rings[rings.length - 1]!.y + 1e-6) {
    rings.push({ y: h, radius: neckR });
  }

  return rings;
}

function packagingProfile(packaging: SkuPackaging): ProfileRing[] {
  return packaging.shape === "CAN"
    ? canProfile(packaging)
    : bottleProfile(packaging);
}

/**
 * Build a watertight low-poly mesh of revolution from parametric packaging.
 */
export function buildPackagingMesh(
  packaging: SkuPackaging,
  options: PackagingMeshOptions = {},
): PackagingMesh {
  const radialSegments = clampSegments(options.radialSegments);
  const profile = packagingProfile(packaging);
  const vertices: number[] = [];
  const indices: number[] = [];

  const ringCount = profile.length;
  for (const ring of profile) {
    for (let i = 0; i < radialSegments; i++) {
      const theta = (i / radialSegments) * Math.PI * 2;
      vertices.push(
        Math.cos(theta) * ring.radius,
        ring.y,
        Math.sin(theta) * ring.radius,
      );
    }
  }

  // Side quads between consecutive profile rings.
  for (let r = 0; r < ringCount - 1; r++) {
    for (let i = 0; i < radialSegments; i++) {
      const iNext = (i + 1) % radialSegments;
      const a = r * radialSegments + i;
      const b = r * radialSegments + iNext;
      const c = (r + 1) * radialSegments + iNext;
      const d = (r + 1) * radialSegments + i;
      indices.push(a, b, d, b, c, d);
    }
  }

  const bottomCenter = vertices.length / 3;
  vertices.push(0, profile[0]!.y, 0);
  const topCenter = vertices.length / 3;
  vertices.push(0, profile[ringCount - 1]!.y, 0);

  // Bottom cap (outward = -Y → CW when looking down +Y, so reverse for CCW from outside).
  for (let i = 0; i < radialSegments; i++) {
    const iNext = (i + 1) % radialSegments;
    indices.push(bottomCenter, iNext, i);
  }

  // Top cap.
  const topRingStart = (ringCount - 1) * radialSegments;
  for (let i = 0; i < radialSegments; i++) {
    const iNext = (i + 1) % radialSegments;
    indices.push(topCenter, topRingStart + i, topRingStart + iNext);
  }

  return { vertices, indices };
}
