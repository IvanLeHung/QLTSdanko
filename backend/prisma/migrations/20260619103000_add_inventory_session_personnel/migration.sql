ALTER TABLE "InventorySession"
ADD COLUMN IF NOT EXISTS "inspectionLeaderId" INTEGER,
ADD COLUMN IF NOT EXISTS "inspectionLeaderName" TEXT,
ADD COLUMN IF NOT EXISTS "inspectionTeamName" TEXT,
ADD COLUMN IF NOT EXISTS "inspectionMembersJson" JSONB,
ADD COLUMN IF NOT EXISTS "departmentRepresentativesJson" JSONB;
