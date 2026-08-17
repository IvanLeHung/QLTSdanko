ALTER TABLE "InventoryItem"
ADD COLUMN "actualCity" TEXT;

UPDATE "InventoryItem"
SET "actualCity" = "expectedCity"
WHERE "checkedAt" IS NOT NULL
  AND "actualCity" IS NULL;
