export function filterSkusByQuery<T extends { name: string; sku: string }>(
  skus: T[],
  query: string,
): T[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return skus;

  return skus.filter(
    (sku) =>
      sku.name.toLowerCase().includes(normalized) ||
      sku.sku.toLowerCase().includes(normalized),
  );
}
