ALTER TABLE "InventoryItem"
ADD COLUMN "expectedCity" TEXT,
ADD COLUMN "expectedProject" TEXT,
ADD COLUMN "expectedDepartment" TEXT,
ADD COLUMN "expectedUserName" TEXT,
ADD COLUMN "expectedSerialNumber" TEXT,
ADD COLUMN "bookQuantity" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "actualQuantity" INTEGER;

UPDATE "InventoryItem" AS item
SET
  "expectedCity" = asset."cityName",
  "expectedProject" = asset."projectName",
  "expectedDepartment" = asset."departmentName",
  "expectedUserName" = asset."currentUserName",
  "expectedSerialNumber" = asset."serialNumber",
  "actualQuantity" = CASE
    WHEN item."checkedAt" IS NULL THEN NULL
    WHEN item."result" = 'MISSING' OR item."checkCondition" = 'MISSING' THEN 0
    ELSE 1
  END
FROM "Asset" AS asset
WHERE item."assetId" = asset."id";
