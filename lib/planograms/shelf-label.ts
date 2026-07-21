/** User-visible shelf number (1-based). Engine `shelf.index` stays 0-based. */
export function shelfDisplayNumber(index: number): number {
  return index + 1;
}

export function shelfDisplayLabel(index: number): string {
  return `Shelf ${shelfDisplayNumber(index)}`;
}
