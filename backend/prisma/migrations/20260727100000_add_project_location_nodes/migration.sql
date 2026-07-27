CREATE TABLE "ProjectLocationNode" (
    "id" SERIAL NOT NULL,
    "cityName" TEXT NOT NULL,
    "projectName" TEXT NOT NULL,
    "parentPath" TEXT NOT NULL DEFAULT '',
    "name" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectLocationNode_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProjectLocationNode_cityName_projectName_parentPath_name_key"
ON "ProjectLocationNode"("cityName", "projectName", "parentPath", "name");

CREATE INDEX "ProjectLocationNode_cityName_projectName_status_idx"
ON "ProjectLocationNode"("cityName", "projectName", "status");
