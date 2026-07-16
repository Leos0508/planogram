-- CreateEnum
CREATE TYPE "WorkspaceTier" AS ENUM ('FREE', 'UNLIMITED');

-- CreateEnum
CREATE TYPE "WorkspaceRole" AS ENUM ('OWNER', 'MEMBER');

-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "tier" "WorkspaceTier" NOT NULL DEFAULT 'FREE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceMember" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "role" "WorkspaceRole" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_slug_key" ON "Workspace"("slug");

-- CreateIndex
CREATE INDEX "WorkspaceMember_workspaceId_idx" ON "WorkspaceMember"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceMember_userId_workspaceId_key" ON "WorkspaceMember"("userId", "workspaceId");

-- AddForeignKey
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add nullable workspace columns for backfill
ALTER TABLE "SKU" ADD COLUMN "workspaceId" TEXT;
ALTER TABLE "Planogram" ADD COLUMN "workspaceId" TEXT;

-- Default workspace for existing catalog rows and users
INSERT INTO "Workspace" ("id", "name", "slug", "tier", "createdAt", "updatedAt")
VALUES (
  'legacy-workspace',
  'Legacy workspace',
  'legacy',
  'FREE',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

UPDATE "SKU" SET "workspaceId" = 'legacy-workspace' WHERE "workspaceId" IS NULL;
UPDATE "Planogram" SET "workspaceId" = 'legacy-workspace' WHERE "workspaceId" IS NULL;

-- Existing users become members of the legacy workspace
INSERT INTO "WorkspaceMember" ("id", "userId", "workspaceId", "role", "createdAt", "updatedAt")
SELECT
  'legacy-member-' || "id",
  "id",
  'legacy-workspace',
  'OWNER',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "User";

-- Require workspaceId
ALTER TABLE "SKU" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "Planogram" ALTER COLUMN "workspaceId" SET NOT NULL;

-- Replace global SKU.sku uniqueness with per-workspace uniqueness
DROP INDEX IF EXISTS "SKU_sku_key";
CREATE UNIQUE INDEX "SKU_workspaceId_sku_key" ON "SKU"("workspaceId", "sku");
CREATE INDEX "SKU_workspaceId_idx" ON "SKU"("workspaceId");
CREATE INDEX "Planogram_workspaceId_idx" ON "Planogram"("workspaceId");

ALTER TABLE "SKU" ADD CONSTRAINT "SKU_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Planogram" ADD CONSTRAINT "Planogram_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
