CREATE TABLE "ProjectLocationCatalog" (
    "id" SERIAL NOT NULL,
    "cityName" TEXT NOT NULL,
    "projectName" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectLocationCatalog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProjectLocationCatalog_cityName_projectName_key"
ON "ProjectLocationCatalog"("cityName", "projectName");

CREATE INDEX "ProjectLocationCatalog_cityName_status_idx"
ON "ProjectLocationCatalog"("cityName", "status");
