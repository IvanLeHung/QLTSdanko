-- Inventory sessions split one inventory period into auditable department/location visits.
CREATE TABLE "InventorySession" (
    "id" SERIAL NOT NULL,
    "inventoryCheckId" INTEGER NOT NULL,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "companyName" TEXT,
    "projectName" TEXT,
    "departmentName" TEXT,
    "locationName" TEXT,
    "checkerName" TEXT,
    "representativeName" TEXT,
    "assetCountPlan" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "completedAt" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventorySession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InventoryDetail" (
    "id" SERIAL NOT NULL,
    "sessionId" INTEGER NOT NULL,
    "assetId" INTEGER,
    "assetCode" TEXT,
    "assetName" TEXT NOT NULL,
    "serialNumber" TEXT,
    "bookUserName" TEXT,
    "actualUserName" TEXT,
    "bookDepartmentName" TEXT,
    "actualDepartmentName" TEXT,
    "bookLocationName" TEXT,
    "actualLocationName" TEXT,
    "resultStatus" TEXT NOT NULL DEFAULT 'MATCH',
    "note" TEXT,
    "imageUrl" TEXT,
    "checkedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryDetail_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ToolInventorySession" (
    "id" SERIAL NOT NULL,
    "inventoryCheckId" INTEGER NOT NULL,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "companyName" TEXT,
    "projectName" TEXT,
    "departmentName" TEXT,
    "locationName" TEXT,
    "checkerName" TEXT,
    "representativeName" TEXT,
    "assetCountPlan" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "completedAt" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ToolInventorySession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ToolInventoryDetail" (
    "id" SERIAL NOT NULL,
    "sessionId" INTEGER NOT NULL,
    "toolId" INTEGER,
    "toolCode" TEXT,
    "toolName" TEXT NOT NULL,
    "serialNumber" TEXT,
    "bookUserName" TEXT,
    "actualUserName" TEXT,
    "bookDepartmentName" TEXT,
    "actualDepartmentName" TEXT,
    "bookLocationName" TEXT,
    "actualLocationName" TEXT,
    "expectedQuantity" INTEGER NOT NULL DEFAULT 1,
    "actualQuantity" INTEGER NOT NULL DEFAULT 1,
    "resultStatus" TEXT NOT NULL DEFAULT 'MATCH',
    "note" TEXT,
    "imageUrl" TEXT,
    "checkedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ToolInventoryDetail_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "InventorySession" ADD CONSTRAINT "InventorySession_inventoryCheckId_fkey" FOREIGN KEY ("inventoryCheckId") REFERENCES "InventoryCheck"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryDetail" ADD CONSTRAINT "InventoryDetail_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "InventorySession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryDetail" ADD CONSTRAINT "InventoryDetail_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ToolInventorySession" ADD CONSTRAINT "ToolInventorySession_inventoryCheckId_fkey" FOREIGN KEY ("inventoryCheckId") REFERENCES "ToolInventoryCheck"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ToolInventoryDetail" ADD CONSTRAINT "ToolInventoryDetail_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ToolInventorySession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ToolInventoryDetail" ADD CONSTRAINT "ToolInventoryDetail_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "ToolEquipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
