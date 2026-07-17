export const SKU_IMAGE_MAX_BYTES = 2 * 1024 * 1024;
export const SKU_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

type SkuImageMime = (typeof SKU_IMAGE_MIME_TYPES)[number];

export function isSkuImageMime(value: string): value is SkuImageMime {
  return (SKU_IMAGE_MIME_TYPES as readonly string[]).includes(value);
}

export function validateSkuImageFile(file: {
  type: string;
  size: number;
  name?: string;
}): string | null {
  if (!isSkuImageMime(file.type)) {
    return "Image must be JPEG, PNG, or WebP";
  }
  if (file.size <= 0) {
    return "Image file is empty";
  }
  if (file.size > SKU_IMAGE_MAX_BYTES) {
    return "Image must be 2 MB or smaller";
  }
  return null;
}

export function sanitizeSkuImageFilename(filename: string): string {
  const base = filename.split(/[/\\]/).pop()?.trim() || "image";
  const cleaned = base
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^\.+/, "")
    .slice(0, 80);
  return cleaned || "image";
}

export function buildSkuImagePathname(
  workspaceId: string,
  filename: string,
): string {
  const safe = sanitizeSkuImageFilename(filename);
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `workspaces/${workspaceId}/skus/${id}-${safe}`;
}

export function isOwnedSkuBlobUrl(
  url: string | null | undefined,
  workspaceId: string,
): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    const isVercelBlob =
      host.endsWith(".public.blob.vercel-storage.com") ||
      host.endsWith(".blob.vercel-storage.com") ||
      host === "blob.vercel-storage.com";
    if (!isVercelBlob) return false;

    const path = decodeURIComponent(parsed.pathname).replace(/^\/+/, "");
    return path.startsWith(`workspaces/${workspaceId}/skus/`);
  } catch {
    return false;
  }
}
