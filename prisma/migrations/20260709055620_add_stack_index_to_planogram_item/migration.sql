-- AlterTable
ALTER TABLE "PlanogramItem" ADD COLUMN     "stackIndex" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "PlanogramItem_planogramShelfId_idx" ON "PlanogramItem"("planogramShelfId");
