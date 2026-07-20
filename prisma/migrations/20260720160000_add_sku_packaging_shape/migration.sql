-- CreateEnum
CREATE TYPE "SkuShape" AS ENUM ('CAN', 'BOTTLE');

-- AlterTable: optional parametric packaging (existing rows stay flat).
ALTER TABLE "SKU" ADD COLUMN "shape" "SkuShape",
ADD COLUMN "packaging" JSONB;
