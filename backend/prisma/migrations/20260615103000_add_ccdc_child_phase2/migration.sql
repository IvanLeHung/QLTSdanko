CREATE TABLE "CCDCChildRepair" (
    "id" SERIAL NOT NULL,
    "childId" INTEGER NOT NULL,
    "repairCode" TEXT NOT NULL,
    "vendorName" TEXT,
    "estimatedCost" DOUBLE PRECISION DEFAULT 0,
    "actualCost" DOUBLE PRECISION DEFAULT 0,
    "damageDescription" TEXT,
    "repairDescription" TEXT,
    "expectedReturnDate" TIMESTAMP(3),
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CCDCChildRepair_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CCDCChildAttachment" (
    "id" SERIAL NOT NULL,
    "childId" INTEGER NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileType" TEXT,
    "category" TEXT NOT NULL DEFAULT 'OTHER',
    "uploadedBy" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CCDCChildAttachment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CCDCChildRepair_repairCode_key" ON "CCDCChildRepair"("repairCode");
CREATE INDEX "CCDCChildRepair_childId_idx" ON "CCDCChildRepair"("childId");
CREATE INDEX "CCDCChildRepair_status_idx" ON "CCDCChildRepair"("status");
CREATE INDEX "CCDCChildRepair_expectedReturnDate_idx" ON "CCDCChildRepair"("expectedReturnDate");
CREATE INDEX "CCDCChildAttachment_childId_idx" ON "CCDCChildAttachment"("childId");
CREATE INDEX "CCDCChildAttachment_category_idx" ON "CCDCChildAttachment"("category");

ALTER TABLE "CCDCChildRepair" ADD CONSTRAINT "CCDCChildRepair_childId_fkey" FOREIGN KEY ("childId") REFERENCES "CCDCChildItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CCDCChildAttachment" ADD CONSTRAINT "CCDCChildAttachment_childId_fkey" FOREIGN KEY ("childId") REFERENCES "CCDCChildItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
