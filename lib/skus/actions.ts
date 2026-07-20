"use server";

import { delIfOwnedSkuBlob, putSkuImage, validateSkuImageFile } from "@/lib/blob/sku-image";
import { prisma } from "@/lib/prisma";
import type { ActionResult } from "@/lib/result";
import {
  type SkuImportFormat,
  type SkuImportRowError,
  parseSkuImport,
} from "@/lib/skus/import-parse";
import {
  type SkuShape,
  resolveSkuDimensions,
} from "@/lib/skus/packaging";
import {
  isValidSkuFootprint,
  normalizeSkuColor,
  resolveCreateSkuColor,
} from "@/lib/validation/sku";
import {
  findSkuInWorkspace,
  requireWorkspaceWrite,
} from "@/lib/workspaces/current";
import { Prisma } from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";

export type SkuRecord = {
  id: string;
  name: string;
  sku: string;
  width: number;
  height: number;
  color: string;
  imageUrl: string | null;
  shape: SkuShape | null;
  packaging: unknown;
};

function normalizeImageUrl(imageUrl?: string | null): string | null {
  const trimmed = imageUrl?.trim() ?? "";
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

function validateSkuInput(input: {
  name: string;
  sku: string;
  width: number;
  height: number;
  color?: string | null;
  imageUrl?: string | null;
  shape?: SkuShape | null;
  packaging?: unknown;
  /** When true, empty/missing color is an error (update). Create allows omit → random. */
  requireColor?: boolean;
}): string | null {
  const name = input.name.trim();
  const code = input.sku.trim();

  if (!name) return "Name is required";
  if (!code) return "SKU code is required";

  const dims = resolveSkuDimensions({
    width: input.width,
    height: input.height,
    shape: input.shape,
    packaging: input.packaging,
  });
  if (!dims.ok) return dims.message;

  // Flat path still needs finite positive footprint (resolve already checks;
  // keep explicit guard when packaging is absent for clearer messages).
  if (dims.shape == null && !isValidSkuFootprint(dims.width, dims.height)) {
    return "Width and height must be positive numbers (mm)";
  }

  const colorProvided =
    input.color !== undefined &&
    input.color !== null &&
    input.color.trim() !== "";

  if (colorProvided && normalizeSkuColor(input.color) === null) {
    return "Color must be a valid hex value (#rrggbb)";
  }

  if (input.requireColor && !colorProvided) {
    return "Color is required";
  }

  if (
    input.imageUrl !== undefined &&
    input.imageUrl !== null &&
    input.imageUrl.trim() !== "" &&
    normalizeImageUrl(input.imageUrl) === null
  ) {
    return "Image URL must be a valid http(s) URL";
  }

  return null;
}

export async function uploadSkuImage(
  formData: FormData,
): Promise<ActionResult<{ url: string }>> {
  try {
    const access = await requireWorkspaceWrite();
    if (!access.ok) return { ok: false, message: access.message };

    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return { ok: false, message: "Image file is required" };
    }

    const validationError = validateSkuImageFile(file);
    if (validationError) return { ok: false, message: validationError };

    const { url } = await putSkuImage(access.workspace.id, file);
    return { ok: true, data: { url } };
  } catch (error) {
    console.error("[uploadSkuImage]", error);
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Failed to upload image";
    return { ok: false, message };
  }
}

export type SkuImportSummary = {
  created: number;
  failed: number;
  errors: SkuImportRowError[];
};

export async function importSkus(input: {
  content: string;
  format: SkuImportFormat;
}): Promise<ActionResult<SkuImportSummary>> {
  if (input.format !== "csv" && input.format !== "json") {
    return { ok: false, message: "Format must be csv or json" };
  }

  try {
    const access = await requireWorkspaceWrite();
    if (!access.ok) return { ok: false, message: access.message };

    const parsed = parseSkuImport(input.content, input.format);
    const errors: SkuImportRowError[] = [...parsed.errors];

    if (parsed.valid.length === 0) {
      return {
        ok: true,
        data: {
          created: 0,
          failed: errors.length,
          errors,
        },
      };
    }

    const existing = await prisma.sKU.findMany({
      where: {
        workspaceId: access.workspace.id,
        OR: parsed.valid.map((row) => ({
          sku: { equals: row.sku, mode: "insensitive" as const },
        })),
      },
      select: { sku: true },
    });
    const existingCodes = new Set(
      existing.map((row) => row.sku.toLowerCase()),
    );

    const toCreate = [];
    for (const row of parsed.valid) {
      if (existingCodes.has(row.sku.toLowerCase())) {
        errors.push({
          row: row.sourceRow,
          message: `SKU code "${row.sku}" already exists in this workspace`,
        });
        continue;
      }
      toCreate.push({
        workspaceId: access.workspace.id,
        name: row.name,
        sku: row.sku,
        width: Math.round(row.width),
        height: Math.round(row.height),
        color: resolveCreateSkuColor(row.color),
        imageUrl: row.imageUrl ?? null,
      });
    }

    if (toCreate.length > 0) {
      await prisma.sKU.createMany({ data: toCreate });
    }

    errors.sort((a, b) => a.row - b.row || a.message.localeCompare(b.message));

    revalidatePath("/skus");
    revalidatePath("/planograms");

    return {
      ok: true,
      data: {
        created: toCreate.length,
        failed: errors.length,
        errors,
      },
    };
  } catch (error) {
    console.error("[importSkus]", error);
    return { ok: false, message: "Failed to import SKUs" };
  }
}

export async function createSku(input: {
  name: string;
  sku: string;
  width: number;
  height: number;
  color?: string | null;
  imageUrl?: string | null;
  shape?: SkuShape | null;
  packaging?: unknown;
}): Promise<ActionResult<SkuRecord>> {
  const error = validateSkuInput(input);
  if (error) return { ok: false, message: error };

  const dims = resolveSkuDimensions({
    width: input.width,
    height: input.height,
    shape: input.shape,
    packaging: input.packaging,
  });
  if (!dims.ok) return { ok: false, message: dims.message };

  try {
    const access = await requireWorkspaceWrite();
    if (!access.ok) return { ok: false, message: access.message };

    const color = resolveCreateSkuColor(input.color);

    const created = await prisma.sKU.create({
      data: {
        workspaceId: access.workspace.id,
        name: input.name.trim(),
        sku: input.sku.trim(),
        width: dims.width,
        height: dims.height,
        color,
        imageUrl: normalizeImageUrl(input.imageUrl),
        shape: dims.shape,
        packaging:
          dims.packaging === null
            ? Prisma.DbNull
            : (dims.packaging as Prisma.InputJsonValue),
      },
    });

    revalidatePath("/skus");
    revalidatePath("/planograms");
    return {
      ok: true,
      data: {
        id: created.id,
        name: created.name,
        sku: created.sku,
        width: created.width,
        height: created.height,
        color: created.color,
        imageUrl: created.imageUrl,
        shape: created.shape,
        packaging: created.packaging,
      },
    };
  } catch (error) {
    console.error("[createSku]", error);
    return {
      ok: false,
      message: "Failed to create SKU. Code may already exist.",
    };
  }
}

export async function updateSku(input: {
  id: string;
  name: string;
  sku: string;
  width: number;
  height: number;
  color: string;
  imageUrl?: string | null;
  shape?: SkuShape | null;
  packaging?: unknown;
}): Promise<ActionResult<SkuRecord>> {
  const error = validateSkuInput({ ...input, requireColor: true });
  if (error) return { ok: false, message: error };

  const dims = resolveSkuDimensions({
    width: input.width,
    height: input.height,
    shape: input.shape,
    packaging: input.packaging,
  });
  if (!dims.ok) return { ok: false, message: dims.message };

  try {
    const access = await requireWorkspaceWrite();
    if (!access.ok) return { ok: false, message: access.message };

    const existing = await findSkuInWorkspace(input.id, access.workspace.id);
    if (!existing) return { ok: false, message: "SKU not found" };

    const nextImageUrl = normalizeImageUrl(input.imageUrl);
    const previousImageUrl = existing.imageUrl;
    const color = normalizeSkuColor(input.color);
    if (!color) return { ok: false, message: "Color must be a valid hex value (#rrggbb)" };

    const updated = await prisma.sKU.update({
      where: { id: input.id },
      data: {
        name: input.name.trim(),
        sku: input.sku.trim(),
        width: dims.width,
        height: dims.height,
        color,
        imageUrl: nextImageUrl,
        shape: dims.shape,
        packaging:
          dims.packaging === null
            ? Prisma.DbNull
            : (dims.packaging as Prisma.InputJsonValue),
      },
    });

    if (previousImageUrl && previousImageUrl !== nextImageUrl) {
      await delIfOwnedSkuBlob(previousImageUrl, access.workspace.id);
    }

    revalidatePath("/skus");
    revalidatePath("/planograms");
    return {
      ok: true,
      data: {
        id: updated.id,
        name: updated.name,
        sku: updated.sku,
        width: updated.width,
        height: updated.height,
        color: updated.color,
        imageUrl: updated.imageUrl,
        shape: updated.shape,
        packaging: updated.packaging,
      },
    };
  } catch (error) {
    console.error("[updateSku]", error);
    return {
      ok: false,
      message: "Failed to update SKU. Code may already exist.",
    };
  }
}

export async function deleteSku(input: {
  id: string;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const access = await requireWorkspaceWrite();
    if (!access.ok) return { ok: false, message: access.message };

    const sku = await prisma.sKU.findFirst({
      where: { id: input.id, workspaceId: access.workspace.id },
      include: { _count: { select: { planogramItems: true } } },
    });

    if (!sku) return { ok: false, message: "SKU not found" };
    if (sku._count.planogramItems > 0) {
      return {
        ok: false,
        message: "Cannot delete SKU that is used on a planogram",
      };
    }

    await prisma.sKU.delete({ where: { id: input.id } });
    await delIfOwnedSkuBlob(sku.imageUrl, access.workspace.id);

    revalidatePath("/skus");
    revalidatePath("/planograms");
    return { ok: true, data: { id: input.id } };
  } catch (error) {
    console.error("[deleteSku]", error);
    return { ok: false, message: "Failed to delete SKU" };
  }
}
