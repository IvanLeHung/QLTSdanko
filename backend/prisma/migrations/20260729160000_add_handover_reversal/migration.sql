ALTER TABLE "HandoverDocument"
ADD COLUMN "reversedAt" TIMESTAMP(3),
ADD COLUMN "reversedBy" TEXT,
ADD COLUMN "reversalReason" TEXT;

ALTER TABLE "HandoverItem"
ADD COLUMN "oldUserName" TEXT,
ADD COLUMN "oldUserPhone" TEXT,
ADD COLUMN "oldPosition" TEXT,
ADD COLUMN "oldDepartmentName" TEXT,
ADD COLUMN "oldLocationName" TEXT,
ADD COLUMN "oldCityName" TEXT,
ADD COLUMN "oldProjectName" TEXT,
ADD COLUMN "oldHandoverDate" TIMESTAMP(3),
ADD COLUMN "snapshotCapturedAt" TIMESTAMP(3);
