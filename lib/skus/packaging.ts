/**
 * Parametric can/bottle packaging for SKUs (Plan 02 S3 / PLA-88).
 * Face-on width×height remain the 2D engine source of truth; when packaging
 * is set they are derived from body diameter × height.
 */

export const SKU_SHAPES = ["CAN", "BOTTLE"] as const;
export type SkuShape = (typeof SKU_SHAPES)[number];

export type CanPackaging = {
  bodyDiameterMm: number;
  heightMm: number;
  endDiameterMm: number;
  baseDiameterMm: number;
  capacityMl?: number;
};

export type BottlePackaging = {
  bodyDiameterMm: number;
  heightMm: number;
  neckDiameterMm: number;
  baseDiameterMm: number;
  capacityMl?: number;
};

export type SkuPackaging =
  | ({ shape: "CAN" } & CanPackaging)
  | ({ shape: "BOTTLE" } & BottlePackaging);

export type FaceOnMm = { width: number; height: number };

export type PackagingParseResult =
  | { ok: true; data: SkuPackaging; face: FaceOnMm }
  | { ok: false; message: string };

function isPositiveFinite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function readNumber(
  source: Record<string, unknown>,
  key: string,
): number | undefined {
  const value = source[key];
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : Number.NaN;
  }
  return Number.NaN;
}

function requirePositiveMm(
  source: Record<string, unknown>,
  key: string,
  label: string,
): { ok: true; value: number } | { ok: false; message: string } {
  const value = readNumber(source, key);
  if (value === undefined || !isPositiveFinite(value)) {
    return { ok: false, message: `${label} must be a positive number (mm)` };
  }
  return { ok: true, value };
}

function optionalCapacityMl(
  source: Record<string, unknown>,
): { ok: true; value?: number } | { ok: false; message: string } {
  const value = readNumber(source, "capacityMl");
  if (value === undefined) return { ok: true, value: undefined };
  if (!isPositiveFinite(value)) {
    return { ok: false, message: "Capacity must be a positive number (ml)" };
  }
  return { ok: true, value };
}

export function isSkuShape(value: unknown): value is SkuShape {
  return value === "CAN" || value === "BOTTLE";
}

/** Derive face-on footprint (mm) from parametric body diameter × height. */
export function deriveFaceOnMm(packaging: SkuPackaging): FaceOnMm {
  return {
    width: Math.round(packaging.bodyDiameterMm),
    height: Math.round(packaging.heightMm),
  };
}

/**
 * Build a sensible can/bottle payload from face-on W×H (D07: body = width, height = height).
 * Ratios match packaging editor defaults / tests (end≈body−1, base≈body−2; neck≤28).
 */
export function packagingFromFaceOn(
  shape: SkuShape,
  face: FaceOnMm,
  capacityMl?: number,
): SkuPackaging {
  const body = face.width;
  const height = face.height;
  if (shape === "CAN") {
    return {
      shape: "CAN",
      bodyDiameterMm: body,
      heightMm: height,
      endDiameterMm: Math.max(1, body - 1),
      baseDiameterMm: Math.max(1, body - 2),
      ...(capacityMl != null ? { capacityMl } : {}),
    };
  }
  return {
    shape: "BOTTLE",
    bodyDiameterMm: body,
    heightMm: height,
    neckDiameterMm: Math.min(28, Math.max(1, Math.round(body * 0.4))),
    baseDiameterMm: Math.max(1, body - 5),
    ...(capacityMl != null ? { capacityMl } : {}),
  };
}

function validateCan(
  source: Record<string, unknown>,
): PackagingParseResult {
  const body = requirePositiveMm(source, "bodyDiameterMm", "Body diameter");
  if (!body.ok) return body;
  const height = requirePositiveMm(source, "heightMm", "Height");
  if (!height.ok) return height;
  const end = requirePositiveMm(source, "endDiameterMm", "End/lid diameter");
  if (!end.ok) return end;
  const base = requirePositiveMm(source, "baseDiameterMm", "Base diameter");
  if (!base.ok) return base;
  const capacity = optionalCapacityMl(source);
  if (!capacity.ok) return capacity;

  if (end.value > body.value) {
    return {
      ok: false,
      message: "End/lid diameter cannot exceed body diameter",
    };
  }
  if (base.value > body.value) {
    return {
      ok: false,
      message: "Base diameter cannot exceed body diameter",
    };
  }

  const data: SkuPackaging = {
    shape: "CAN",
    bodyDiameterMm: body.value,
    heightMm: height.value,
    endDiameterMm: end.value,
    baseDiameterMm: base.value,
    ...(capacity.value !== undefined ? { capacityMl: capacity.value } : {}),
  };
  return { ok: true, data, face: deriveFaceOnMm(data) };
}

function validateBottle(
  source: Record<string, unknown>,
): PackagingParseResult {
  const body = requirePositiveMm(source, "bodyDiameterMm", "Body diameter");
  if (!body.ok) return body;
  const height = requirePositiveMm(source, "heightMm", "Height");
  if (!height.ok) return height;
  const neck = requirePositiveMm(source, "neckDiameterMm", "Neck diameter");
  if (!neck.ok) return neck;
  const base = requirePositiveMm(source, "baseDiameterMm", "Base diameter");
  if (!base.ok) return base;
  const capacity = optionalCapacityMl(source);
  if (!capacity.ok) return capacity;

  if (neck.value >= body.value) {
    return {
      ok: false,
      message: "Neck diameter must be smaller than body diameter",
    };
  }
  if (base.value > body.value) {
    return {
      ok: false,
      message: "Base diameter cannot exceed body diameter",
    };
  }

  const data: SkuPackaging = {
    shape: "BOTTLE",
    bodyDiameterMm: body.value,
    heightMm: height.value,
    neckDiameterMm: neck.value,
    baseDiameterMm: base.value,
    ...(capacity.value !== undefined ? { capacityMl: capacity.value } : {}),
  };
  return { ok: true, data, face: deriveFaceOnMm(data) };
}

/**
 * Parse and validate a shape + raw packaging object (form/API/JSON).
 * Returns derived face-on mm when valid.
 */
export function parseSkuPackaging(
  shape: unknown,
  packaging: unknown,
): PackagingParseResult {
  if (shape == null || shape === "" || shape === "NONE") {
    if (
      packaging == null ||
      (typeof packaging === "object" &&
        packaging !== null &&
        Object.keys(packaging as object).length === 0)
    ) {
      return { ok: false, message: "Shape is required when packaging is set" };
    }
    return { ok: false, message: "Shape must be CAN or BOTTLE" };
  }

  if (!isSkuShape(shape)) {
    return { ok: false, message: "Shape must be CAN or BOTTLE" };
  }

  if (packaging == null || typeof packaging !== "object" || Array.isArray(packaging)) {
    return { ok: false, message: "Packaging dimensions are required" };
  }

  const source = packaging as Record<string, unknown>;
  return shape === "CAN" ? validateCan(source) : validateBottle(source);
}

/**
 * Resolve create/update footprint + optional packaging.
 * - Flat SKU: shape/packaging omitted → use explicit width/height.
 * - Parametric: derive width/height from packaging (overwrite client W/H).
 */
export function resolveSkuDimensions(input: {
  width: number;
  height: number;
  shape?: SkuShape | null;
  packaging?: unknown;
}):
  | {
      ok: true;
      width: number;
      height: number;
      shape: SkuShape | null;
      packaging: Omit<SkuPackaging, "shape"> | null;
    }
  | { ok: false; message: string } {
  const hasShape = input.shape != null;
  const hasPackaging =
    input.packaging != null &&
    typeof input.packaging === "object" &&
    !Array.isArray(input.packaging) &&
    Object.keys(input.packaging as object).length > 0;

  if (!hasShape && !hasPackaging) {
    if (
      !Number.isFinite(input.width) ||
      !Number.isFinite(input.height) ||
      input.width <= 0 ||
      input.height <= 0
    ) {
      return {
        ok: false,
        message: "Width and height must be positive numbers (mm)",
      };
    }
    return {
      ok: true,
      width: Math.round(input.width),
      height: Math.round(input.height),
      shape: null,
      packaging: null,
    };
  }

  if (hasShape !== hasPackaging) {
    return {
      ok: false,
      message: "Shape and packaging must be set together (or both cleared)",
    };
  }

  const parsed = parseSkuPackaging(input.shape, input.packaging);
  if (!parsed.ok) return parsed;

  const { shape, ...payload } = parsed.data;
  return {
    ok: true,
    width: parsed.face.width,
    height: parsed.face.height,
    shape,
    packaging: payload,
  };
}

/** Rehydrate stored DB JSON + shape into a typed packaging value, or null. */
export function readStoredPackaging(
  shape: unknown,
  packaging: unknown,
): SkuPackaging | null {
  if (!isSkuShape(shape) || packaging == null) return null;
  const parsed = parseSkuPackaging(shape, packaging);
  return parsed.ok ? parsed.data : null;
}
