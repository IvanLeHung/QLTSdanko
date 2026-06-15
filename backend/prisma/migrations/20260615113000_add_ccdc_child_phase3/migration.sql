ALTER TABLE "CCDCChildAttachment" ADD COLUMN "fileSize" INTEGER;
ALTER TABLE "CCDCChildAttachment" ADD COLUMN "mimeType" TEXT;

CREATE TABLE "CCDCApprovalRequest" (
    "id" SERIAL NOT NULL,
    "childId" INTEGER NOT NULL,
    "parentId" INTEGER NOT NULL,
    "requestType" TEXT NOT NULL,
    "oldData" TEXT,
    "newData" TEXT,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "requestedBy" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedBy" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectReason" TEXT,
    CONSTRAINT "CCDCApprovalRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CCDCChildInventoryBatch" (
    "id" SERIAL NOT NULL,
    "batchId" TEXT NOT NULL,
    "scopeJson" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SCANNED',
    "totalScanned" INTEGER NOT NULL DEFAULT 0,
    "processedCount" INTEGER NOT NULL DEFAULT 0,
    "confirmedCount" INTEGER NOT NULL DEFAULT 0,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    CONSTRAINT "CCDCChildInventoryBatch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CCDCChildInventoryScan" (
    "id" SERIAL NOT NULL,
    "batchId" TEXT NOT NULL,
    "childId" INTEGER,
    "childCode" TEXT,
    "barcode" TEXT NOT NULL,
    "scanStatus" TEXT NOT NULL DEFAULT 'SCANNED',
    "note" TEXT,
    "scannedBy" TEXT NOT NULL,
    "scannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),
    CONSTRAINT "CCDCChildInventoryScan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CCDCAlert" (
    "id" SERIAL NOT NULL,
    "childId" INTEGER,
    "alertType" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'MEDIUM',
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    CONSTRAINT "CCDCAlert_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CCDCChildInventoryBatch_batchId_key" ON "CCDCChildInventoryBatch"("batchId");
CREATE INDEX "CCDCApprovalRequest_childId_idx" ON "CCDCApprovalRequest"("childId");
CREATE INDEX "CCDCApprovalRequest_parentId_idx" ON "CCDCApprovalRequest"("parentId");
CREATE INDEX "CCDCApprovalRequest_requestType_idx" ON "CCDCApprovalRequest"("requestType");
CREATE INDEX "CCDCApprovalRequest_status_idx" ON "CCDCApprovalRequest"("status");
CREATE INDEX "CCDCApprovalRequest_requestedAt_idx" ON "CCDCApprovalRequest"("requestedAt");
CREATE INDEX "CCDCChildInventoryScan_batchId_idx" ON "CCDCChildInventoryScan"("batchId");
CREATE INDEX "CCDCChildInventoryScan_childId_idx" ON "CCDCChildInventoryScan"("childId");
CREATE INDEX "CCDCChildInventoryScan_barcode_idx" ON "CCDCChildInventoryScan"("barcode");
CREATE INDEX "CCDCChildInventoryScan_scanStatus_idx" ON "CCDCChildInventoryScan"("scanStatus");
CREATE INDEX "CCDCAlert_childId_idx" ON "CCDCAlert"("childId");
CREATE INDEX "CCDCAlert_alertType_idx" ON "CCDCAlert"("alertType");
CREATE INDEX "CCDCAlert_status_idx" ON "CCDCAlert"("status");
CREATE INDEX "CCDCAlert_createdAt_idx" ON "CCDCAlert"("createdAt");

ALTER TABLE "CCDCApprovalRequest" ADD CONSTRAINT "CCDCApprovalRequest_childId_fkey" FOREIGN KEY ("childId") REFERENCES "CCDCChildItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CCDCChildInventoryScan" ADD CONSTRAINT "CCDCChildInventoryScan_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "CCDCChildInventoryBatch"("batchId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CCDCChildInventoryScan" ADD CONSTRAINT "CCDCChildInventoryScan_childId_fkey" FOREIGN KEY ("childId") REFERENCES "CCDCChildItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CCDCAlert" ADD CONSTRAINT "CCDCAlert_childId_fkey" FOREIGN KEY ("childId") REFERENCES "CCDCChildItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
