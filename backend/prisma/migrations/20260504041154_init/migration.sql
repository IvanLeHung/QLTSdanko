-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "assetCode" TEXT NOT NULL,
    "legacyAssetCode" TEXT,
    "runningNo" INTEGER NOT NULL,
    "runningNoText" TEXT NOT NULL,
    "companyCode" TEXT NOT NULL,
    "groupLv1" TEXT NOT NULL,
    "groupLv2" TEXT NOT NULL,
    "groupLv3" TEXT NOT NULL,
    "groupLv4" TEXT NOT NULL,
    "classification1" TEXT,
    "classification2" TEXT,
    "classification3" TEXT,
    "assetGroup" TEXT NOT NULL,
    "assetName" TEXT NOT NULL,
    "serialNumber" TEXT,
    "unit" TEXT DEFAULT 'Cái',
    "usageType" TEXT,
    "status" TEXT NOT NULL DEFAULT 'IN_STOCK',
    "currentUserName" TEXT,
    "currentPosition" TEXT,
    "departmentName" TEXT,
    "locationName" TEXT,
    "cityName" TEXT,
    "purchasePrice" REAL,
    "extraInfo1" TEXT,
    "extraInfo2" TEXT,
    "note" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    "deletedByUserId" INTEGER
);

-- CreateTable
CREATE TABLE "AssetCodeCounter" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "companyCode" TEXT NOT NULL,
    "groupLv1" TEXT NOT NULL,
    "groupLv2" TEXT NOT NULL,
    "groupLv3" TEXT NOT NULL,
    "groupLv4" TEXT NOT NULL,
    "lastRunningNo" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AssetAssignment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "assetId" INTEGER NOT NULL,
    "oldStatus" TEXT,
    "newStatus" TEXT,
    "oldUserName" TEXT,
    "newUserName" TEXT,
    "oldPosition" TEXT,
    "newPosition" TEXT,
    "oldDepartmentName" TEXT,
    "newDepartmentName" TEXT,
    "oldLocationName" TEXT,
    "newLocationName" TEXT,
    "oldCityName" TEXT,
    "newCityName" TEXT,
    "effectiveAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "createdByUserId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AssetAssignment_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AssetRepair" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "assetId" INTEGER NOT NULL,
    "issueDescription" TEXT NOT NULL,
    "repairVendor" TEXT,
    "repairCost" REAL DEFAULT 0,
    "sentDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedDate" DATETIME,
    "repairStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "resultNote" TEXT,
    "createdByUserId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AssetRepair_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InventoryCheck" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "inventoryCode" TEXT NOT NULL,
    "inventoryName" TEXT NOT NULL,
    "scopeType" TEXT NOT NULL DEFAULT 'ALL',
    "scopeValue" TEXT,
    "inventoryDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdByUserId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "inventoryCheckId" INTEGER NOT NULL,
    "assetId" INTEGER NOT NULL,
    "assetCode" TEXT NOT NULL,
    "checkStatus" TEXT NOT NULL DEFAULT 'CHECKED',
    "actualUserName" TEXT,
    "actualDepartmentName" TEXT,
    "actualLocationName" TEXT,
    "actualCityName" TEXT,
    "conditionNote" TEXT,
    "checkedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkedByUserId" INTEGER,
    "note" TEXT,
    CONSTRAINT "InventoryItem_inventoryCheckId_fkey" FOREIGN KEY ("inventoryCheckId") REFERENCES "InventoryCheck" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "InventoryItem_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AssetDisposal" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "assetId" INTEGER NOT NULL,
    "disposalDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disposalReason" TEXT,
    "disposalMethod" TEXT,
    "disposalValue" REAL DEFAULT 0,
    "approvedByUserId" INTEGER,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "AssetEvent" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "assetId" INTEGER NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "oldStatus" TEXT,
    "newStatus" TEXT,
    "oldUserName" TEXT,
    "newUserName" TEXT,
    "oldDepartmentName" TEXT,
    "newDepartmentName" TEXT,
    "oldLocationName" TEXT,
    "newLocationName" TEXT,
    "description" TEXT,
    "createdByUserId" INTEGER,
    CONSTRAINT "AssetEvent_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AssetEditLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "assetId" INTEGER NOT NULL,
    "assetCode" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "editedByUserId" INTEGER,
    "editedByName" TEXT,
    "editedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AssetEditLog_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DocumentCounter" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "documentType" TEXT NOT NULL,
    "lastNumber" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "HandoverDocument" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "documentNo" TEXT NOT NULL,
    "documentType" TEXT NOT NULL DEFAULT 'BBBGTS',
    "recipientName" TEXT NOT NULL,
    "recipientPosition" TEXT,
    "recipientDepartment" TEXT,
    "locationName" TEXT,
    "cityName" TEXT,
    "note" TEXT,
    "createdByUserId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "HandoverDocumentItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "documentId" INTEGER NOT NULL,
    "assetId" INTEGER NOT NULL,
    "assetCode" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HandoverDocumentItem_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "HandoverDocument" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "HandoverDocumentItem_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ImportBatch" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "fileName" TEXT NOT NULL,
    "totalRows" INTEGER NOT NULL,
    "successRows" INTEGER NOT NULL,
    "failedRows" INTEGER NOT NULL,
    "createdByUserId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ImportError" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "importBatchId" INTEGER NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "errorMessage" TEXT NOT NULL,
    "rawDataJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ImportError_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "ImportBatch" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_assetCode_key" ON "Asset"("assetCode");

-- CreateIndex
CREATE UNIQUE INDEX "AssetCodeCounter_companyCode_groupLv1_groupLv2_groupLv3_groupLv4_key" ON "AssetCodeCounter"("companyCode", "groupLv1", "groupLv2", "groupLv3", "groupLv4");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryCheck_inventoryCode_key" ON "InventoryCheck"("inventoryCode");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryItem_inventoryCheckId_assetId_key" ON "InventoryItem"("inventoryCheckId", "assetId");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentCounter_documentType_key" ON "DocumentCounter"("documentType");

-- CreateIndex
CREATE UNIQUE INDEX "HandoverDocument_documentNo_key" ON "HandoverDocument"("documentNo");
