-- CreateTable
CREATE TABLE "SKU" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SKU_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Planogram" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "topClearance" INTEGER NOT NULL,
    "stackGap" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Planogram_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanogramShelf" (
    "id" TEXT NOT NULL,
    "planogramId" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanogramShelf_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanogramItem" (
    "id" TEXT NOT NULL,
    "planogramShelfId" TEXT NOT NULL,
    "skuId" TEXT NOT NULL,
    "x" INTEGER NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanogramItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SKU_sku_key" ON "SKU"("sku");

-- AddForeignKey
ALTER TABLE "PlanogramShelf" ADD CONSTRAINT "PlanogramShelf_planogramId_fkey" FOREIGN KEY ("planogramId") REFERENCES "Planogram"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanogramItem" ADD CONSTRAINT "PlanogramItem_planogramShelfId_fkey" FOREIGN KEY ("planogramShelfId") REFERENCES "PlanogramShelf"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanogramItem" ADD CONSTRAINT "PlanogramItem_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "SKU"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
