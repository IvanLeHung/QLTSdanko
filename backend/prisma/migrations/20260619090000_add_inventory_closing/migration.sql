ALTER TABLE "InventoryItem"
ADD COLUMN "lockedAt" TIMESTAMP(3),
ADD COLUMN "lockedBy" TEXT,
ADD COLUMN "closingScopeId" INTEGER;

ALTER TABLE "InventoryDetail"
ADD COLUMN "lockedAt" TIMESTAMP(3),
ADD COLUMN "lockedBy" TEXT,
ADD COLUMN "closingScopeId" INTEGER;

CREATE TABLE "InventoryClosingRecord" (
  "id" SERIAL NOT NULL,
  "inventoryCheckId" INTEGER NOT NULL,
  "closingCode" TEXT NOT NULL,
  "closingDate" TIMESTAMP(3) NOT NULL,
  "closedAt" TIMESTAMP(3),
  "closedBy" TEXT,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "totalItems" INTEGER NOT NULL DEFAULT 0,
  "matchedItems" INTEGER NOT NULL DEFAULT 0,
  "discrepancyItems" INTEGER NOT NULL DEFAULT 0,
  "missingItems" INTEGER NOT NULL DEFAULT 0,
  "extraItems" INTEGER NOT NULL DEFAULT 0,
  "damagedItems" INTEGER NOT NULL DEFAULT 0,
  "differencePercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "summaryJson" JSONB,
  "closingNote" TEXT,
  "forceCloseReason" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  "reopenCount" INTEGER NOT NULL DEFAULT 0,
  "reopenHistory" JSONB NOT NULL DEFAULT '[]',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "InventoryClosingRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InventoryClosingScope" (
  "id" SERIAL NOT NULL,
  "closingId" INTEGER NOT NULL,
  "scopeType" TEXT NOT NULL,
  "sessionId" INTEGER,
  "departmentId" INTEGER,
  "locationId" INTEGER,
  "projectValue" TEXT,
  "scopeDate" TIMESTAMP(3),
  "scopeLabel" TEXT,
  "itemCount" INTEGER NOT NULL DEFAULT 0,
  "matchedCount" INTEGER NOT NULL DEFAULT 0,
  "differenceCount" INTEGER NOT NULL DEFAULT 0,
  "pendingCount" INTEGER NOT NULL DEFAULT 0,
  "extraCount" INTEGER NOT NULL DEFAULT 0,
  "missingCount" INTEGER NOT NULL DEFAULT 0,
  "damagedCount" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'PARTIAL',
  "lockedAt" TIMESTAMP(3),
  "lockedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "InventoryClosingScope_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InventoryClosingSigner" (
  "id" SERIAL NOT NULL,
  "closingId" INTEGER NOT NULL,
  "signerRole" TEXT NOT NULL,
  "fullName" TEXT NOT NULL,
  "position" TEXT,
  "department" TEXT,
  "signatureImage" TEXT,
  "signedAt" TIMESTAMP(3),
  "signStatus" TEXT NOT NULL DEFAULT 'PENDING',
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "InventoryClosingSigner_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InventoryReportFile" (
  "id" SERIAL NOT NULL,
  "closingId" INTEGER NOT NULL,
  "inventoryCheckId" INTEGER NOT NULL,
  "reportCode" TEXT NOT NULL,
  "reportType" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "fileUrl" TEXT NOT NULL,
  "fileType" TEXT NOT NULL,
  "template" TEXT,
  "paperSize" TEXT,
  "orientation" TEXT,
  "includeSignatures" BOOLEAN NOT NULL DEFAULT false,
  "includePhotos" BOOLEAN NOT NULL DEFAULT false,
  "language" TEXT NOT NULL DEFAULT 'vi',
  "parametersJson" JSONB,
  "version" INTEGER NOT NULL DEFAULT 1,
  "isOutdated" BOOLEAN NOT NULL DEFAULT false,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "rowCount" INTEGER NOT NULL DEFAULT 0,
  "checksum" TEXT,

  CONSTRAINT "InventoryReportFile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InventoryClosingRecord_closingCode_key" ON "InventoryClosingRecord"("closingCode");
CREATE INDEX "InventoryClosingRecord_inventoryCheckId_idx" ON "InventoryClosingRecord"("inventoryCheckId");
CREATE INDEX "InventoryClosingRecord_status_idx" ON "InventoryClosingRecord"("status");
CREATE INDEX "InventoryClosingRecord_closingDate_idx" ON "InventoryClosingRecord"("closingDate");

CREATE INDEX "InventoryClosingScope_closingId_idx" ON "InventoryClosingScope"("closingId");
CREATE INDEX "InventoryClosingScope_scopeType_scopeDate_idx" ON "InventoryClosingScope"("scopeType", "scopeDate");
CREATE INDEX "InventoryClosingScope_sessionId_idx" ON "InventoryClosingScope"("sessionId");
CREATE INDEX "InventoryClosingScope_departmentId_scopeDate_idx" ON "InventoryClosingScope"("departmentId", "scopeDate");
CREATE INDEX "InventoryClosingScope_locationId_scopeDate_idx" ON "InventoryClosingScope"("locationId", "scopeDate");
CREATE INDEX "InventoryClosingScope_projectValue_scopeDate_idx" ON "InventoryClosingScope"("projectValue", "scopeDate");

CREATE INDEX "InventoryClosingSigner_closingId_idx" ON "InventoryClosingSigner"("closingId");
CREATE INDEX "InventoryClosingSigner_signerRole_idx" ON "InventoryClosingSigner"("signerRole");
CREATE INDEX "InventoryClosingSigner_signStatus_idx" ON "InventoryClosingSigner"("signStatus");

CREATE INDEX "InventoryReportFile_closingId_idx" ON "InventoryReportFile"("closingId");
CREATE INDEX "InventoryReportFile_inventoryCheckId_idx" ON "InventoryReportFile"("inventoryCheckId");
CREATE INDEX "InventoryReportFile_reportType_idx" ON "InventoryReportFile"("reportType");
CREATE INDEX "InventoryReportFile_isOutdated_idx" ON "InventoryReportFile"("isOutdated");

CREATE INDEX "InventoryItem_closingScopeId_idx" ON "InventoryItem"("closingScopeId");
CREATE INDEX "InventoryDetail_closingScopeId_idx" ON "InventoryDetail"("closingScopeId");

ALTER TABLE "InventoryClosingRecord"
ADD CONSTRAINT "InventoryClosingRecord_inventoryCheckId_fkey"
FOREIGN KEY ("inventoryCheckId") REFERENCES "InventoryCheck"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "InventoryClosingScope"
ADD CONSTRAINT "InventoryClosingScope_closingId_fkey"
FOREIGN KEY ("closingId") REFERENCES "InventoryClosingRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InventoryClosingScope"
ADD CONSTRAINT "InventoryClosingScope_sessionId_fkey"
FOREIGN KEY ("sessionId") REFERENCES "InventorySession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "InventoryClosingSigner"
ADD CONSTRAINT "InventoryClosingSigner_closingId_fkey"
FOREIGN KEY ("closingId") REFERENCES "InventoryClosingRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InventoryReportFile"
ADD CONSTRAINT "InventoryReportFile_closingId_fkey"
FOREIGN KEY ("closingId") REFERENCES "InventoryClosingRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InventoryItem"
ADD CONSTRAINT "InventoryItem_closingScopeId_fkey"
FOREIGN KEY ("closingScopeId") REFERENCES "InventoryClosingScope"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "InventoryDetail"
ADD CONSTRAINT "InventoryDetail_closingScopeId_fkey"
FOREIGN KEY ("closingScopeId") REFERENCES "InventoryClosingScope"("id") ON DELETE SET NULL ON UPDATE CASCADE;
