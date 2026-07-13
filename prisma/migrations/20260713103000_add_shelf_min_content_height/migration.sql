-- Manual shelf content height floor (mm). Default matches MIN_SHELF_CONTENT_HEIGHT_MM.

ALTER TABLE "PlanogramShelf" ADD COLUMN "minContentHeightMm" INTEGER NOT NULL DEFAULT 500;
