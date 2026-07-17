import { del, put } from "@vercel/blob";
import {
  buildSkuImagePathname,
  isOwnedSkuBlobUrl,
  validateSkuImageFile,
} from "@/lib/blob/sku-image-shared";

export {
  SKU_IMAGE_MAX_BYTES,
  SKU_IMAGE_MIME_TYPES,
  buildSkuImagePathname,
  isOwnedSkuBlobUrl,
  isSkuImageMime,
  sanitizeSkuImageFilename,
  validateSkuImageFile,
} from "@/lib/blob/sku-image-shared";

export async function putSkuImage(
  workspaceId: string,
  file: File,
): Promise<{ url: string }> {
  const error = validateSkuImageFile(file);
  if (error) {
    throw new Error(error);
  }

  const pathname = buildSkuImagePathname(workspaceId, file.name);
  const blob = await put(pathname, file, {
    access: "public",
    contentType: file.type,
    addRandomSuffix: false,
  });
  return { url: blob.url };
}

export async function delIfOwnedSkuBlob(
  url: string | null | undefined,
  workspaceId: string,
): Promise<void> {
  if (!isOwnedSkuBlobUrl(url, workspaceId) || !url) return;
  try {
    await del(url);
  } catch (error) {
    console.error("[delIfOwnedSkuBlob]", error);
  }
}
