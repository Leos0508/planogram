/** Canonical SKU display color: `#` + 6 lowercase hex digits. */
const SKU_COLOR_RE = /^#[0-9a-f]{6}$/;

/** Curated fills for seed / default assignment (distinct, mid-saturation). */
export const SKU_COLOR_PALETTE = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
] as const;

export function isValidSkuFootprint(width: number, height: number): boolean {
  return (
    Number.isFinite(width) &&
    Number.isFinite(height) &&
    width > 0 &&
    height > 0
  );
}

export function parsePositiveInt(value: string): number | null {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

export function parseNonNegativeInt(value: string): number | null {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }
  return parsed;
}

/** Normalize a user color to `#rrggbb`, or null if invalid. */
export function normalizeSkuColor(value?: string | null): string | null {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return null;

  const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  const normalized = withHash.toLowerCase();
  if (!SKU_COLOR_RE.test(normalized)) return null;
  return normalized;
}

export function isValidSkuColor(value?: string | null): boolean {
  return normalizeSkuColor(value) !== null;
}

/** Pick a random palette color for new SKUs without a chosen color. */
export function randomSkuColor(
  random: () => number = Math.random,
): (typeof SKU_COLOR_PALETTE)[number] {
  const index = Math.floor(random() * SKU_COLOR_PALETTE.length);
  return SKU_COLOR_PALETTE[index] ?? SKU_COLOR_PALETTE[0];
}

/** Color for create: normalized input, or a random palette default. */
export function resolveCreateSkuColor(
  color?: string | null,
  random: () => number = Math.random,
): string {
  return normalizeSkuColor(color) ?? randomSkuColor(random);
}

/** Stable palette color from a string (seed rows, migration-style backfill). */
export function skuColorFromKey(key: string): (typeof SKU_COLOR_PALETTE)[number] {
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return SKU_COLOR_PALETTE[hash % SKU_COLOR_PALETTE.length] ?? SKU_COLOR_PALETTE[0];
}
