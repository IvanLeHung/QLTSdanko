CREATE TABLE "ToolCodeCounter" (
  "id" SERIAL NOT NULL,
  "categoryKey" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "currentNumber" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ToolCodeCounter_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ToolCodeCounter_categoryKey_year_key" ON "ToolCodeCounter"("categoryKey", "year");
CREATE INDEX "ToolCodeCounter_categoryKey_idx" ON "ToolCodeCounter"("categoryKey");

CREATE TABLE "ToolCategoryChangeRequest" (
  "id" SERIAL NOT NULL,
  "toolId" INTEGER NOT NULL,
  "oldCategory" TEXT NOT NULL,
  "newCategory" TEXT NOT NULL,
  "oldToolCode" TEXT NOT NULL,
  "newToolCode" TEXT,
  "idempotencyKey" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "reason" TEXT,
  "requestedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),

  CONSTRAINT "ToolCategoryChangeRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ToolCategoryChangeRequest_toolId_idempotencyKey_key" ON "ToolCategoryChangeRequest"("toolId", "idempotencyKey");
CREATE INDEX "ToolCategoryChangeRequest_toolId_idx" ON "ToolCategoryChangeRequest"("toolId");
CREATE INDEX "ToolCategoryChangeRequest_oldToolCode_idx" ON "ToolCategoryChangeRequest"("oldToolCode");
CREATE INDEX "ToolCategoryChangeRequest_newToolCode_idx" ON "ToolCategoryChangeRequest"("newToolCode");
