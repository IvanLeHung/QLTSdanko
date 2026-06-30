ALTER TABLE "Asset"
ADD COLUMN "offboardingAlert" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "offboardingEmployeeId" TEXT,
ADD COLUMN "offboardingEmployeeName" TEXT,
ADD COLUMN "offboardingDate" TIMESTAMP(3),
ADD COLUMN "expectedRecoveryDate" TIMESTAMP(3),
ADD COLUMN "offboardingNote" TEXT,
ADD COLUMN "offboardingResolvedAt" TIMESTAMP(3),
ADD COLUMN "recoveryPriority" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "Asset_offboardingAlert_expectedRecoveryDate_idx" ON "Asset"("offboardingAlert", "expectedRecoveryDate");
CREATE INDEX "Asset_recoveryPriority_idx" ON "Asset"("recoveryPriority");
