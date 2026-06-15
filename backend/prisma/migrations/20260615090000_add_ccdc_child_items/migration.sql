CREATE TABLE "CCDCChildItem" (
    "id" SERIAL NOT NULL,
    "parentCcdcId" INTEGER NOT NULL,
    "parentCode" TEXT NOT NULL,
    "childCode" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "lotNumber" TEXT,
    "color" TEXT,
    "size" TEXT,
    "specification" TEXT,
    "description" TEXT,
    "serialNumber" TEXT,
    "location" TEXT,
    "department" TEXT,
    "user" TEXT,
    "childStatus" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "inventoryStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "condition" TEXT,
    "note" TEXT,
    "hasHandover" BOOLEAN NOT NULL DEFAULT false,
    "hasTransfer" BOOLEAN NOT NULL DEFAULT false,
    "isPrinted" BOOLEAN NOT NULL DEFAULT false,
    "printedAt" TIMESTAMP(3),
    "printedBy" TEXT,
    "lastInventoryAt" TIMESTAMP(3),
    "lastInventoryBy" TEXT,
    "lastInventorySessionId" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancelledBy" TEXT,
    "cancelledReason" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CCDCChildItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CCDCChildItem_childCode_key" ON "CCDCChildItem"("childCode");
CREATE INDEX "CCDCChildItem_parentCcdcId_idx" ON "CCDCChildItem"("parentCcdcId");
CREATE INDEX "CCDCChildItem_parentCode_idx" ON "CCDCChildItem"("parentCode");
CREATE INDEX "CCDCChildItem_childStatus_idx" ON "CCDCChildItem"("childStatus");
CREATE INDEX "CCDCChildItem_inventoryStatus_idx" ON "CCDCChildItem"("inventoryStatus");
CREATE INDEX "CCDCChildItem_location_idx" ON "CCDCChildItem"("location");
CREATE INDEX "CCDCChildItem_department_idx" ON "CCDCChildItem"("department");
CREATE INDEX "CCDCChildItem_user_idx" ON "CCDCChildItem"("user");
CREATE INDEX "CCDCChildItem_lotNumber_idx" ON "CCDCChildItem"("lotNumber");

ALTER TABLE "CCDCChildItem" ADD CONSTRAINT "CCDCChildItem_parentCcdcId_fkey" FOREIGN KEY ("parentCcdcId") REFERENCES "ToolEquipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
