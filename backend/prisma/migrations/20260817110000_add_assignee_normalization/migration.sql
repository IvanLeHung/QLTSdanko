-- CreateTable
CREATE TABLE "AssetAssigneeProfile" (
    "id" SERIAL NOT NULL,
    "canonicalName" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "primaryPhone" TEXT,
    "normalizedPhone" TEXT,
    "canonicalPosition" TEXT,
    "departmentName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssetAssigneeProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetAssigneeAlias" (
    "id" SERIAL NOT NULL,
    "profileId" INTEGER NOT NULL,
    "originalName" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "originalPhone" TEXT,
    "normalizedPhone" TEXT,
    "originalPosition" TEXT,
    "normalizedPosition" TEXT,
    "originalDepartment" TEXT,
    "normalizedDepartment" TEXT,
    "source" TEXT NOT NULL DEFAULT 'ASSET_REGISTER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssetAssigneeAlias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetAssigneeMergeDecision" (
    "id" SERIAL NOT NULL,
    "groupKey" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "candidateSnapshot" JSONB NOT NULL,
    "canonicalSnapshot" JSONB,
    "batchId" TEXT,
    "profileId" INTEGER,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssetAssigneeMergeDecision_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Asset" ADD COLUMN "currentAssigneeProfileId" INTEGER;

-- CreateIndex
CREATE INDEX "Asset_currentAssigneeProfileId_idx" ON "Asset"("currentAssigneeProfileId");
CREATE INDEX "AssetAssigneeProfile_normalizedName_idx" ON "AssetAssigneeProfile"("normalizedName");
CREATE INDEX "AssetAssigneeProfile_normalizedPhone_idx" ON "AssetAssigneeProfile"("normalizedPhone");
CREATE INDEX "AssetAssigneeProfile_status_idx" ON "AssetAssigneeProfile"("status");
CREATE INDEX "AssetAssigneeAlias_normalizedName_idx" ON "AssetAssigneeAlias"("normalizedName");
CREATE INDEX "AssetAssigneeAlias_normalizedPhone_idx" ON "AssetAssigneeAlias"("normalizedPhone");
CREATE INDEX "AssetAssigneeAlias_profileId_idx" ON "AssetAssigneeAlias"("profileId");
CREATE UNIQUE INDEX "AssetAssigneeMergeDecision_groupKey_key" ON "AssetAssigneeMergeDecision"("groupKey");
CREATE INDEX "AssetAssigneeMergeDecision_normalizedName_idx" ON "AssetAssigneeMergeDecision"("normalizedName");
CREATE INDEX "AssetAssigneeMergeDecision_status_idx" ON "AssetAssigneeMergeDecision"("status");
CREATE INDEX "AssetAssigneeMergeDecision_batchId_idx" ON "AssetAssigneeMergeDecision"("batchId");

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_currentAssigneeProfileId_fkey" FOREIGN KEY ("currentAssigneeProfileId") REFERENCES "AssetAssigneeProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AssetAssigneeAlias" ADD CONSTRAINT "AssetAssigneeAlias_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "AssetAssigneeProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssetAssigneeMergeDecision" ADD CONSTRAINT "AssetAssigneeMergeDecision_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "AssetAssigneeProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
