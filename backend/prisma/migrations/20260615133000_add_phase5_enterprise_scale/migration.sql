ALTER TABLE "Asset" ADD COLUMN "organizationUnitId" INTEGER;
ALTER TABLE "ToolEquipment" ADD COLUMN "organizationUnitId" INTEGER;
ALTER TABLE "CCDCChildItem" ADD COLUMN "organizationUnitId" INTEGER;

CREATE TABLE "OrganizationUnit" (
    "id" SERIAL NOT NULL,
    "parentId" INTEGER,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrganizationUnit_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AssetFinanceProfile" (
    "id" SERIAL NOT NULL,
    "assetId" INTEGER NOT NULL,
    "originalValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "purchaseDate" TIMESTAMP(3),
    "depreciationMethod" TEXT,
    "usefulLife" INTEGER,
    "accumulatedDepreciation" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "remainingValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "costCenter" TEXT,
    "syncedAt" TIMESTAMP(3),
    CONSTRAINT "AssetFinanceProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OrganizationUnit_type_code_key" ON "OrganizationUnit"("type", "code");
CREATE INDEX "OrganizationUnit_parentId_idx" ON "OrganizationUnit"("parentId");
CREATE INDEX "OrganizationUnit_type_idx" ON "OrganizationUnit"("type");
CREATE INDEX "OrganizationUnit_status_idx" ON "OrganizationUnit"("status");
CREATE UNIQUE INDEX "AssetFinanceProfile_assetId_key" ON "AssetFinanceProfile"("assetId");
CREATE INDEX "AssetFinanceProfile_costCenter_idx" ON "AssetFinanceProfile"("costCenter");
CREATE INDEX "Asset_organizationUnitId_idx" ON "Asset"("organizationUnitId");
CREATE INDEX "ToolEquipment_organizationUnitId_idx" ON "ToolEquipment"("organizationUnitId");
CREATE INDEX "CCDCChildItem_organizationUnitId_idx" ON "CCDCChildItem"("organizationUnitId");

ALTER TABLE "OrganizationUnit" ADD CONSTRAINT "OrganizationUnit_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "OrganizationUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AssetFinanceProfile" ADD CONSTRAINT "AssetFinanceProfile_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_organizationUnitId_fkey" FOREIGN KEY ("organizationUnitId") REFERENCES "OrganizationUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ToolEquipment" ADD CONSTRAINT "ToolEquipment_organizationUnitId_fkey" FOREIGN KEY ("organizationUnitId") REFERENCES "OrganizationUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CCDCChildItem" ADD CONSTRAINT "CCDCChildItem_organizationUnitId_fkey" FOREIGN KEY ("organizationUnitId") REFERENCES "OrganizationUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "PurchaseRequest" (
    "id" SERIAL NOT NULL,
    "requestNo" TEXT NOT NULL,
    "requestType" TEXT NOT NULL DEFAULT 'ASSET',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "estimatedValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "requestedBy" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    CONSTRAINT "PurchaseRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PurchaseOrder" (
    "id" SERIAL NOT NULL,
    "poNo" TEXT NOT NULL,
    "requestId" INTEGER,
    "supplierName" TEXT,
    "totalValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GoodsReceipt" (
    "id" SERIAL NOT NULL,
    "receiptNo" TEXT NOT NULL,
    "poId" INTEGER,
    "itemType" TEXT NOT NULL DEFAULT 'ASSET',
    "itemName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'POSTED',
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generatedAssetId" INTEGER,
    "generatedToolId" INTEGER,
    CONSTRAINT "GoodsReceipt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OfflineSyncLog" (
    "id" SERIAL NOT NULL,
    "deviceId" TEXT NOT NULL,
    "userId" INTEGER,
    "action" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "syncStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "conflictPolicy" TEXT NOT NULL DEFAULT 'CLIENT_REVIEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "syncedAt" TIMESTAMP(3),
    CONSTRAINT "OfflineSyncLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DigitalSignature" (
    "id" SERIAL NOT NULL,
    "documentId" TEXT NOT NULL,
    "signedBy" TEXT NOT NULL,
    "signatureImage" TEXT NOT NULL,
    "signedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deviceInfo" TEXT,
    "lockedAt" TIMESTAMP(3),
    CONSTRAINT "DigitalSignature_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AssetAnalyticsSnapshot" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "companyId" INTEGER,
    "assetCount" INTEGER NOT NULL DEFAULT 0,
    "assetValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "activeCount" INTEGER NOT NULL DEFAULT 0,
    "lostCount" INTEGER NOT NULL DEFAULT 0,
    "repairCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "inventoryRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AssetAnalyticsSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IntegrationConfig" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "authType" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "IntegrationConfig_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IntegrationLog" (
    "id" SERIAL NOT NULL,
    "integrationId" INTEGER,
    "direction" TEXT NOT NULL DEFAULT 'OUTBOUND',
    "status" TEXT NOT NULL,
    "message" TEXT,
    "payload" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "IntegrationLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'IN_APP',
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ExportLog" (
    "id" SERIAL NOT NULL,
    "exportedBy" TEXT NOT NULL,
    "exportType" TEXT NOT NULL,
    "rowCount" INTEGER NOT NULL DEFAULT 0,
    "filtersJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExportLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PurchaseRequest_requestNo_key" ON "PurchaseRequest"("requestNo");
CREATE UNIQUE INDEX "PurchaseOrder_poNo_key" ON "PurchaseOrder"("poNo");
CREATE UNIQUE INDEX "GoodsReceipt_receiptNo_key" ON "GoodsReceipt"("receiptNo");
CREATE UNIQUE INDEX "AssetAnalyticsSnapshot_date_companyId_key" ON "AssetAnalyticsSnapshot"("date", "companyId");
CREATE INDEX "PurchaseRequest_status_idx" ON "PurchaseRequest"("status");
CREATE INDEX "PurchaseRequest_requestType_idx" ON "PurchaseRequest"("requestType");
CREATE INDEX "PurchaseOrder_requestId_idx" ON "PurchaseOrder"("requestId");
CREATE INDEX "PurchaseOrder_status_idx" ON "PurchaseOrder"("status");
CREATE INDEX "GoodsReceipt_poId_idx" ON "GoodsReceipt"("poId");
CREATE INDEX "GoodsReceipt_itemType_idx" ON "GoodsReceipt"("itemType");
CREATE INDEX "OfflineSyncLog_deviceId_idx" ON "OfflineSyncLog"("deviceId");
CREATE INDEX "OfflineSyncLog_userId_idx" ON "OfflineSyncLog"("userId");
CREATE INDEX "OfflineSyncLog_syncStatus_idx" ON "OfflineSyncLog"("syncStatus");
CREATE INDEX "DigitalSignature_documentId_idx" ON "DigitalSignature"("documentId");
CREATE INDEX "DigitalSignature_signedBy_idx" ON "DigitalSignature"("signedBy");
CREATE INDEX "AssetAnalyticsSnapshot_date_idx" ON "AssetAnalyticsSnapshot"("date");
CREATE INDEX "AssetAnalyticsSnapshot_companyId_idx" ON "AssetAnalyticsSnapshot"("companyId");
CREATE INDEX "IntegrationConfig_type_idx" ON "IntegrationConfig"("type");
CREATE INDEX "IntegrationConfig_status_idx" ON "IntegrationConfig"("status");
CREATE INDEX "IntegrationLog_integrationId_idx" ON "IntegrationLog"("integrationId");
CREATE INDEX "IntegrationLog_status_idx" ON "IntegrationLog"("status");
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");
CREATE INDEX "Notification_type_idx" ON "Notification"("type");
CREATE INDEX "Notification_readAt_idx" ON "Notification"("readAt");
CREATE INDEX "ExportLog_exportedBy_idx" ON "ExportLog"("exportedBy");
CREATE INDEX "ExportLog_exportType_idx" ON "ExportLog"("exportType");

ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "PurchaseRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GoodsReceipt" ADD CONSTRAINT "GoodsReceipt_poId_fkey" FOREIGN KEY ("poId") REFERENCES "PurchaseOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "IntegrationLog" ADD CONSTRAINT "IntegrationLog_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "IntegrationConfig"("id") ON DELETE SET NULL ON UPDATE CASCADE;
