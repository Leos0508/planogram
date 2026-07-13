-- Replace stackIndex with shelf-local y (bottom offset above shelf line, mm).

ALTER TABLE "PlanogramItem" ADD COLUMN "y" INTEGER NOT NULL DEFAULT 0;

UPDATE "PlanogramItem" AS pi
SET "y" = sub.stack_offset
FROM (
  SELECT
    p.id,
    COALESCE(
      (
        SELECT SUM(p2.height + pg."stackGap")
        FROM "PlanogramItem" AS p2
        INNER JOIN "PlanogramShelf" AS ps2 ON ps2.id = p2."planogramShelfId"
        INNER JOIN "Planogram" AS pg2 ON pg2.id = ps2."planogramId"
        WHERE p2."planogramShelfId" = p."planogramShelfId"
          AND p2."stackIndex" < p."stackIndex"
      ),
      0
    ) AS stack_offset
  FROM "PlanogramItem" AS p
  INNER JOIN "PlanogramShelf" AS ps ON ps.id = p."planogramShelfId"
  INNER JOIN "Planogram" AS pg ON pg.id = ps."planogramId"
) AS sub
WHERE pi.id = sub.id;

ALTER TABLE "PlanogramItem" DROP COLUMN "stackIndex";
