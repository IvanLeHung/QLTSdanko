ALTER TABLE "AssetNormalizationJob" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'ASSET';
ALTER TABLE "AssetNormalizationSuggestion" ADD COLUMN "ccdcChildId" INTEGER;
ALTER TABLE "AssetNormalizationSuggestion" ADD COLUMN "approvedBy" TEXT;
ALTER TABLE "AssetNormalizationSuggestion" ADD COLUMN "approvedAt" TIMESTAMP(3);

CREATE TABLE "DuplicateSuggestion" (
    "id" SERIAL NOT NULL,
    "itemAType" TEXT NOT NULL DEFAULT 'ASSET',
    "itemAId" INTEGER NOT NULL,
    "itemBType" TEXT NOT NULL DEFAULT 'ASSET',
    "itemBId" INTEGER NOT NULL,
    "similarityScore" DOUBLE PRECISION NOT NULL,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DuplicateSuggestion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AssetAnomaly" (
    "id" SERIAL NOT NULL,
    "assetId" INTEGER,
    "childId" INTEGER,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'MEDIUM',
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AssetAnomaly_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AutomationRule" (
    "id" SERIAL NOT NULL,
    "trigger" TEXT NOT NULL,
    "condition" TEXT,
    "action" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AutomationRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AutomationTask" (
    "id" SERIAL NOT NULL,
    "ruleId" INTEGER,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "entityType" TEXT,
    "entityId" INTEGER,
    "assignedTo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "AutomationTask_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AssetLifecyclePrediction" (
    "id" SERIAL NOT NULL,
    "assetId" INTEGER,
    "toolId" INTEGER,
    "childId" INTEGER,
    "healthScore" INTEGER NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "recommendation" TEXT NOT NULL,
    "predictedReplaceDate" TIMESTAMP(3),
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AssetLifecyclePrediction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DuplicateSuggestion_status_idx" ON "DuplicateSuggestion"("status");
CREATE INDEX "DuplicateSuggestion_similarityScore_idx" ON "DuplicateSuggestion"("similarityScore");
CREATE INDEX "AssetAnomaly_assetId_idx" ON "AssetAnomaly"("assetId");
CREATE INDEX "AssetAnomaly_childId_idx" ON "AssetAnomaly"("childId");
CREATE INDEX "AssetAnomaly_type_idx" ON "AssetAnomaly"("type");
CREATE INDEX "AssetAnomaly_status_idx" ON "AssetAnomaly"("status");
CREATE INDEX "AutomationRule_trigger_idx" ON "AutomationRule"("trigger");
CREATE INDEX "AutomationRule_enabled_idx" ON "AutomationRule"("enabled");
CREATE INDEX "AutomationTask_status_idx" ON "AutomationTask"("status");
CREATE INDEX "AutomationTask_entityType_entityId_idx" ON "AutomationTask"("entityType", "entityId");
CREATE INDEX "AssetLifecyclePrediction_assetId_idx" ON "AssetLifecyclePrediction"("assetId");
CREATE INDEX "AssetLifecyclePrediction_toolId_idx" ON "AssetLifecyclePrediction"("toolId");
CREATE INDEX "AssetLifecyclePrediction_childId_idx" ON "AssetLifecyclePrediction"("childId");
CREATE INDEX "AssetLifecyclePrediction_riskLevel_idx" ON "AssetLifecyclePrediction"("riskLevel");

ALTER TABLE "AutomationTask" ADD CONSTRAINT "AutomationTask_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "AutomationRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
