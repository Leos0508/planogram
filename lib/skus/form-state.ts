import {
  type SkuShape,
  deriveFaceOnMm,
  isSkuShape,
  parseSkuPackaging,
  readStoredPackaging,
} from "@/lib/skus/packaging";
import type { Sku } from "@/lib/skus/queries";
import {
  isValidSkuFootprint,
  normalizeSkuColor,
  randomSkuColor,
} from "@/lib/validation/sku";

export type ShapeMode = "NONE" | SkuShape;

export type SkuFormState = {
  name: string;
  sku: string;
  width: string;
  height: string;
  color: string;
  imageUrl: string;
  imageFile: File | null;
  clearImage: boolean;
  shape: ShapeMode;
  bodyDiameterMm: string;
  heightMm: string;
  endDiameterMm: string;
  baseDiameterMm: string;
  neckDiameterMm: string;
  capacityMl: string;
};

export const emptyForm = (): SkuFormState => ({
  name: "",
  sku: "",
  width: "",
  height: "",
  color: randomSkuColor(),
  imageUrl: "",
  imageFile: null,
  clearImage: false,
  shape: "NONE",
  bodyDiameterMm: "",
  heightMm: "",
  endDiameterMm: "",
  baseDiameterMm: "",
  neckDiameterMm: "",
  capacityMl: "",
});

export function formFromSku(sku: Sku): SkuFormState {
  const packaging = readStoredPackaging(sku.shape, sku.packaging);
  return {
    name: sku.name,
    sku: sku.sku,
    width: String(sku.width),
    height: String(sku.height),
    color: sku.color,
    imageUrl: sku.imageUrl ?? "",
    imageFile: null,
    clearImage: false,
    shape: packaging?.shape ?? "NONE",
    bodyDiameterMm:
      packaging != null ? String(packaging.bodyDiameterMm) : "",
    heightMm: packaging != null ? String(packaging.heightMm) : "",
    endDiameterMm:
      packaging?.shape === "CAN" ? String(packaging.endDiameterMm) : "",
    baseDiameterMm:
      packaging != null ? String(packaging.baseDiameterMm) : "",
    neckDiameterMm:
      packaging?.shape === "BOTTLE" ? String(packaging.neckDiameterMm) : "",
    capacityMl:
      packaging?.capacityMl != null ? String(packaging.capacityMl) : "",
  };
}

export function packagingInputFromForm(values: SkuFormState) {
  const base = {
    bodyDiameterMm: values.bodyDiameterMm,
    heightMm: values.heightMm,
    baseDiameterMm: values.baseDiameterMm,
    capacityMl: values.capacityMl.trim() ? values.capacityMl : undefined,
  };
  if (values.shape === "CAN") {
    return { ...base, endDiameterMm: values.endDiameterMm };
  }
  if (values.shape === "BOTTLE") {
    return { ...base, neckDiameterMm: values.neckDiameterMm };
  }
  return null;
}

export function derivedFacePreview(values: SkuFormState): {
  width: string;
  height: string;
} | null {
  if (values.shape === "NONE") return null;
  const packaging = packagingInputFromForm(values);
  if (!packaging) return null;
  const parsed = parseSkuPackaging(values.shape, packaging);
  if (!parsed.ok) return null;
  const face = deriveFaceOnMm(parsed.data);
  return { width: String(face.width), height: String(face.height) };
}

export function livePackagingFromForm(values: SkuFormState) {
  if (values.shape === "NONE") {
    return { ok: false as const, message: "Choose can or bottle packaging" };
  }
  const packaging = packagingInputFromForm(values);
  if (!packaging) {
    return { ok: false as const, message: "Packaging dimensions are required" };
  }
  return parseSkuPackaging(values.shape, packaging);
}

export function parseForm(values: SkuFormState) {
  const color = normalizeSkuColor(values.color);
  if (!color) {
    return {
      ok: false as const,
      message: "Color must be a valid hex value (#rrggbb)",
    };
  }

  const imageFields = {
    imageUrl: values.clearImage ? null : values.imageUrl.trim() || null,
    imageFile: values.imageFile,
    clearImage: values.clearImage,
  };

  if (values.shape === "NONE") {
    const width = Number.parseInt(values.width, 10);
    const height = Number.parseInt(values.height, 10);
    if (!isValidSkuFootprint(width, height)) {
      return {
        ok: false as const,
        message: "Width and height must be positive mm",
      };
    }
    return {
      ok: true as const,
      data: {
        name: values.name.trim(),
        sku: values.sku.trim(),
        width,
        height,
        color,
        shape: null as SkuShape | null,
        packaging: null as unknown,
        ...imageFields,
      },
    };
  }

  if (!isSkuShape(values.shape)) {
    return { ok: false as const, message: "Shape must be CAN or BOTTLE" };
  }

  const packaging = packagingInputFromForm(values);
  const parsed = parseSkuPackaging(values.shape, packaging);
  if (!parsed.ok) {
    return { ok: false as const, message: parsed.message };
  }

  return {
    ok: true as const,
    data: {
      name: values.name.trim(),
      sku: values.sku.trim(),
      width: parsed.face.width,
      height: parsed.face.height,
      color,
      shape: parsed.data.shape,
      packaging: packagingInputFromForm(values),
      ...imageFields,
    },
  };
}
