-- AlterTable: add SKU display color for no-image differentiation.
-- Backfill existing rows with a stable hash-based palette so they are not all the same gray.
ALTER TABLE "SKU" ADD COLUMN "color" TEXT;

UPDATE "SKU"
SET "color" = (ARRAY[
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#14b8a6',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899'
])[1 + (abs(hashtext(id)) % 8)];

ALTER TABLE "SKU" ALTER COLUMN "color" SET NOT NULL;
