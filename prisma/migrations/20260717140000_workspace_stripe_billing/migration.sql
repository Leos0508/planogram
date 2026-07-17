-- AlterTable
ALTER TABLE "Workspace" ADD COLUMN "stripeCustomerId" TEXT;
ALTER TABLE "Workspace" ADD COLUMN "stripeSubscriptionId" TEXT;
ALTER TABLE "Workspace" ADD COLUMN "stripeSubscriptionStatus" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_stripeCustomerId_key" ON "Workspace"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_stripeSubscriptionId_key" ON "Workspace"("stripeSubscriptionId");
