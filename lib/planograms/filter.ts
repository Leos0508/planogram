export function filterPlanogramsByName<T extends { name: string }>(
  planograms: T[],
  query: string,
): T[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return planograms;

  return planograms.filter((planogram) =>
    planogram.name.toLowerCase().includes(normalized),
  );
}
